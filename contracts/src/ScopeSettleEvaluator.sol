// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IAgenticCommerce } from "./interfaces/IAgenticCommerce.sol";

/// @title ScopeSettle signed verdict evaluator
/// @notice Verifies evidence-linked EIP-712 verdicts and enforces a challenge window.
/// @dev The signer and reviewer are explicitly trusted beta roles, not trustless oracles.
contract ScopeSettleEvaluator is EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    uint16 public constant BPS = 10_000;

    enum Outcome {
        Pass,
        Fail,
        ManualReview
    }

    struct Verdict {
        uint256 jobId;
        bytes32 deliverableHash;
        bytes32 reportHash;
        uint16 score;
        uint16 confidence;
        Outcome outcome;
        uint256 nonce;
        uint64 deadline;
    }

    struct Proposal {
        bytes32 deliverableHash;
        bytes32 reportHash;
        bytes32 verdictDigest;
        uint64 proposedAt;
        uint64 challengeUntil;
        uint16 score;
        uint16 confidence;
        Outcome outcome;
        bool challenged;
        bool finalized;
        bool exists;
    }

    bytes32 public constant VERDICT_TYPEHASH = keccak256(
        "Verdict(uint256 jobId,bytes32 deliverableHash,bytes32 reportHash,uint16 score,uint16 confidence,uint8 outcome,uint256 nonce,uint64 deadline)"
    );

    // Lower camel case intentionally preserves ergonomic public ABI getters.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IAgenticCommerce public immutable commerce;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable verdictSigner;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable reviewer;

    mapping(uint256 nonce => bool used) public usedNonces;
    mapping(bytes32 digest => bool used) public usedVerdicts;
    mapping(uint256 jobId => Proposal proposal) private _proposals;

    event VerdictProposed(
        uint256 indexed jobId,
        bytes32 indexed reportHash,
        bytes32 indexed verdictDigest,
        bytes32 deliverableHash,
        uint16 score,
        uint16 confidence,
        Outcome outcome,
        uint64 challengeUntil
    );
    event VerdictChallenged(
        uint256 indexed jobId, address indexed challenger, bytes32 indexed reasonHash
    );
    event VerdictFinalized(
        uint256 indexed jobId, bytes32 indexed reportHash, Outcome indexed outcome
    );
    event ManualReviewResolved(
        uint256 indexed jobId,
        address indexed reviewer,
        bool approved,
        bytes32 indexed resolutionReasonHash
    );

    error ZeroAddress();
    error RolesMustDiffer();
    error InvalidRange();
    error InvalidCommitment();
    error SignatureExpired();
    error InvalidSignature();
    error Replay();
    error ProposalExists();
    error ProposalMissing();
    error WrongJobState();
    error WrongEvaluator();
    error DeliverableMismatch();
    error OutcomePolicyMismatch();
    error InsufficientChallengeTime();
    error Unauthorized();
    error ChallengeClosed();
    error NotFinalizable();
    error AlreadyFinalized();

    constructor(address commerce_, address verdictSigner_, address reviewer_)
        EIP712("ScopeSettleEvaluator", "1")
    {
        if (commerce_ == address(0) || verdictSigner_ == address(0) || reviewer_ == address(0)) {
            revert ZeroAddress();
        }
        if (verdictSigner_ == reviewer_) revert RolesMustDiffer();
        commerce = IAgenticCommerce(commerce_);
        verdictSigner = verdictSigner_;
        reviewer = reviewer_;
    }

    /// @notice Validates and records a signed verdict without immediately moving funds.
    function proposeVerdict(Verdict calldata verdict, bytes calldata signature) external {
        if (verdict.deadline < block.timestamp) revert SignatureExpired();
        if (verdict.score > BPS || verdict.confidence > BPS) revert InvalidRange();
        if (verdict.deliverableHash == bytes32(0) || verdict.reportHash == bytes32(0)) {
            revert InvalidCommitment();
        }
        if (_proposals[verdict.jobId].exists) revert ProposalExists();
        if (usedNonces[verdict.nonce]) revert Replay();

        bytes32 digest = hashVerdict(verdict);
        if (digest.recover(signature) != verdictSigner) revert InvalidSignature();

        IAgenticCommerce.SettlementContext memory context =
            commerce.settlementContext(verdict.jobId);

        if (context.status != IAgenticCommerce.JobStatus.Submitted) revert WrongJobState();
        if (context.evaluator != address(this)) revert WrongEvaluator();
        if (context.deliverable != verdict.deliverableHash) revert DeliverableMismatch();
        _validateOutcome(verdict, context.minimumScore, context.minimumConfidence);

        uint64 challengeUntil;
        if (verdict.outcome != Outcome.ManualReview) {
            uint256 challengeEnd = block.timestamp + context.challengeWindow;
            if (context.challengeWindow == 0 || challengeEnd > context.expiredAt) {
                revert InsufficientChallengeTime();
            }
            // Safe because challengeEnd was proven <= the uint64 job expiry above.
            // forge-lint: disable-next-line(unsafe-typecast)
            challengeUntil = uint64(challengeEnd);
        }

        usedNonces[verdict.nonce] = true;
        usedVerdicts[digest] = true;
        _proposals[verdict.jobId] = Proposal({
            deliverableHash: verdict.deliverableHash,
            reportHash: verdict.reportHash,
            verdictDigest: digest,
            proposedAt: uint64(block.timestamp),
            challengeUntil: challengeUntil,
            score: verdict.score,
            confidence: verdict.confidence,
            outcome: verdict.outcome,
            challenged: false,
            finalized: false,
            exists: true
        });

        emit VerdictProposed(
            verdict.jobId,
            verdict.reportHash,
            digest,
            verdict.deliverableHash,
            verdict.score,
            verdict.confidence,
            verdict.outcome,
            challengeUntil
        );
    }

    /// @notice Lets either economic party halt automatic settlement before the boundary.
    function challenge(uint256 jobId, bytes32 reasonHash) external {
        Proposal storage proposal = _requireProposal(jobId);
        if (proposal.finalized) revert AlreadyFinalized();
        if (proposal.outcome == Outcome.ManualReview || block.timestamp >= proposal.challengeUntil)
        {
            revert ChallengeClosed();
        }
        IAgenticCommerce.SettlementContext memory context = commerce.settlementContext(jobId);
        if (msg.sender != context.client && msg.sender != context.provider) revert Unauthorized();
        if (reasonHash == bytes32(0)) revert InvalidCommitment();
        proposal.challenged = true;
        emit VerdictChallenged(jobId, msg.sender, reasonHash);
    }

    /// @notice Permissionlessly settles an eligible, unchallenged proposal at the boundary.
    function finalize(uint256 jobId) external nonReentrant {
        Proposal storage proposal = _requireProposal(jobId);
        if (proposal.finalized) revert AlreadyFinalized();
        if (
            proposal.outcome == Outcome.ManualReview || proposal.challenged
                || block.timestamp < proposal.challengeUntil
        ) revert NotFinalizable();

        proposal.finalized = true;
        _settle(jobId, proposal.reportHash, proposal.outcome == Outcome.Pass);
        emit VerdictFinalized(jobId, proposal.reportHash, proposal.outcome);
    }

    /// @notice Trusted human/multisig resolution for challenged or ambiguous proposals.
    function resolveManualReview(uint256 jobId, bool approved, bytes32 resolutionReasonHash)
        external
        nonReentrant
    {
        if (msg.sender != reviewer) revert Unauthorized();
        Proposal storage proposal = _requireProposal(jobId);
        if (proposal.finalized) revert AlreadyFinalized();
        if (!proposal.challenged && proposal.outcome != Outcome.ManualReview) {
            revert NotFinalizable();
        }
        if (resolutionReasonHash == bytes32(0)) revert InvalidCommitment();

        proposal.finalized = true;
        _settle(jobId, proposal.reportHash, approved);
        emit ManualReviewResolved(jobId, msg.sender, approved, resolutionReasonHash);
        emit VerdictFinalized(jobId, proposal.reportHash, approved ? Outcome.Pass : Outcome.Fail);
    }

    function getProposal(uint256 jobId) external view returns (Proposal memory) {
        Proposal storage proposal = _requireProposal(jobId);
        return proposal;
    }

    function hashVerdict(Verdict calldata verdict) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    VERDICT_TYPEHASH,
                    verdict.jobId,
                    verdict.deliverableHash,
                    verdict.reportHash,
                    verdict.score,
                    verdict.confidence,
                    verdict.outcome,
                    verdict.nonce,
                    verdict.deadline
                )
            )
        );
    }

    function _validateOutcome(
        Verdict calldata verdict,
        uint16 minimumScore,
        uint16 minimumConfidence
    ) internal pure {
        if (verdict.outcome == Outcome.ManualReview) return;
        if (verdict.confidence < minimumConfidence) revert OutcomePolicyMismatch();
        bool passesScore = verdict.score >= minimumScore;
        if (
            (verdict.outcome == Outcome.Pass && !passesScore)
                || (verdict.outcome == Outcome.Fail && passesScore)
        ) revert OutcomePolicyMismatch();
    }

    function _settle(uint256 jobId, bytes32 reportHash, bool approved) internal {
        if (approved) {
            commerce.complete(jobId, reportHash, "");
        } else {
            commerce.reject(jobId, reportHash, "");
        }
    }

    function _requireProposal(uint256 jobId) internal view returns (Proposal storage proposal) {
        proposal = _proposals[jobId];
        if (!proposal.exists) revert ProposalMissing();
    }
}
