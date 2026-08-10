// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { IAgenticCommerce } from "../src/interfaces/IAgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";
import { ScopeSettleEvaluator } from "../src/ScopeSettleEvaluator.sol";

contract ScopeSettleEvaluatorTest is Test {
    uint256 internal constant SIGNER_KEY = 0xA11CE;
    uint256 internal constant OTHER_KEY = 0xB0B;
    uint256 internal constant BUDGET = 500e6;
    bytes32 internal constant SPECIFICATION_HASH = keccak256("specification");
    bytes32 internal constant RUBRIC_HASH = keccak256("rubric");
    bytes32 internal constant DELIVERABLE_HASH = keccak256("deliverable");
    bytes32 internal constant REPORT_HASH = keccak256("report");

    address internal client = makeAddr("client");
    address internal provider = makeAddr("provider");
    address internal reviewer = makeAddr("reviewer");
    address internal stranger = makeAddr("stranger");
    address internal signer;

    MockUSDG internal token;
    AgenticCommerce internal commerce;
    ScopeSettleEvaluator internal evaluator;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        token = new MockUSDG(client, 1_000_000e6);
        commerce = new AgenticCommerce(address(token));
        evaluator = new ScopeSettleEvaluator(address(commerce), signer, reviewer);
    }

    function _policy(uint32 challengeWindow)
        internal
        pure
        returns (AgenticCommerce.ScopePolicy memory)
    {
        return AgenticCommerce.ScopePolicy({
            specificationHash: SPECIFICATION_HASH,
            rubricHash: RUBRIC_HASH,
            minimumScore: 8_000,
            minimumConfidence: 7_500,
            challengeWindow: challengeWindow
        });
    }

    function _createSubmittedFor(address jobEvaluator, uint32 window, uint64 expiresIn)
        internal
        returns (uint256 jobId)
    {
        vm.startPrank(client);
        jobId = commerce.createScopedJob(
            provider,
            jobEvaluator,
            uint64(block.timestamp + expiresIn),
            "description",
            _policy(window)
        );
        commerce.setBudget(jobId, BUDGET, "");
        token.approve(address(commerce), BUDGET);
        commerce.fund(jobId, BUDGET, "");
        vm.stopPrank();
        vm.prank(provider);
        commerce.submit(jobId, DELIVERABLE_HASH, "");
    }

    function _verdict(uint256 jobId, ScopeSettleEvaluator.Outcome outcome, uint256 nonce)
        internal
        view
        returns (ScopeSettleEvaluator.Verdict memory)
    {
        return ScopeSettleEvaluator.Verdict({
            jobId: jobId,
            deliverableHash: DELIVERABLE_HASH,
            reportHash: REPORT_HASH,
            score: outcome == ScopeSettleEvaluator.Outcome.Fail ? 7_900 : 9_000,
            confidence: 8_500,
            outcome: outcome,
            nonce: nonce,
            deadline: uint64(block.timestamp + 1 hours)
        });
    }

    function _sign(ScopeSettleEvaluator.Verdict memory verdict, uint256 privateKey)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = evaluator.hashVerdict(verdict);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _propose(uint256 jobId, ScopeSettleEvaluator.Outcome outcome, uint256 nonce)
        internal
        returns (ScopeSettleEvaluator.Verdict memory verdict)
    {
        verdict = _verdict(jobId, outcome, nonce);
        evaluator.proposeVerdict(verdict, _sign(verdict, SIGNER_KEY));
    }

    function testConstructorValidation() public {
        vm.expectRevert(ScopeSettleEvaluator.ZeroAddress.selector);
        new ScopeSettleEvaluator(address(0), signer, reviewer);
        vm.expectRevert(ScopeSettleEvaluator.ZeroAddress.selector);
        new ScopeSettleEvaluator(address(commerce), address(0), reviewer);
        vm.expectRevert(ScopeSettleEvaluator.RolesMustDiffer.selector);
        new ScopeSettleEvaluator(address(commerce), signer, signer);
    }

    function testProposesValidPassVerdict() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _propose(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        ScopeSettleEvaluator.Proposal memory proposal = evaluator.getProposal(jobId);

        assertEq(proposal.reportHash, REPORT_HASH);
        assertEq(proposal.deliverableHash, DELIVERABLE_HASH);
        assertEq(proposal.score, verdict.score);
        assertEq(proposal.confidence, verdict.confidence);
        assertEq(uint256(proposal.outcome), uint256(ScopeSettleEvaluator.Outcome.Pass));
        assertEq(proposal.challengeUntil, block.timestamp + 1 days);
        assertTrue(evaluator.usedNonces(1));
        assertTrue(evaluator.usedVerdicts(proposal.verdictDigest));
    }

    function testRejectsInvalidSignatureExpiredDeadlineAndRanges() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signature = _sign(verdict, OTHER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.InvalidSignature.selector);
        evaluator.proposeVerdict(verdict, signature);

        verdict.deadline = uint64(block.timestamp - 1);
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.SignatureExpired.selector);
        evaluator.proposeVerdict(verdict, signature);

        verdict.deadline = uint64(block.timestamp + 1 hours);
        verdict.score = 10_001;
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.InvalidRange.selector);
        evaluator.proposeVerdict(verdict, signature);

        verdict.score = 9_000;
        verdict.reportHash = bytes32(0);
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.InvalidCommitment.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testNonceCannotBeReusedAcrossJobs() public {
        uint256 firstJob = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        uint256 secondJob = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(firstJob, ScopeSettleEvaluator.Outcome.Pass, 7);
        ScopeSettleEvaluator.Verdict memory second =
            _verdict(secondJob, ScopeSettleEvaluator.Outcome.Pass, 7);
        bytes memory signature = _sign(second, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.Replay.selector);
        evaluator.proposeVerdict(second, signature);
    }

    function testOnlyOneProposalPerJob() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        ScopeSettleEvaluator.Verdict memory second =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 2);
        bytes memory signature = _sign(second, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.ProposalExists.selector);
        evaluator.proposeVerdict(second, signature);
    }

    function testBindsJobStateEvaluatorAndDeliverable() public {
        uint256 wrongEvaluatorJob = _createSubmittedFor(stranger, 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(wrongEvaluatorJob, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.WrongEvaluator.selector);
        evaluator.proposeVerdict(verdict, signature);

        uint256 validJob = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        verdict = _verdict(validJob, ScopeSettleEvaluator.Outcome.Pass, 2);
        verdict.deliverableHash = keccak256("different");
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.DeliverableMismatch.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testRequiresSubmittedState() public {
        vm.startPrank(client);
        uint256 jobId = commerce.createScopedJob(
            provider,
            address(evaluator),
            uint64(block.timestamp + 7 days),
            "description",
            _policy(1 days)
        );
        commerce.setBudget(jobId, BUDGET, "");
        token.approve(address(commerce), BUDGET);
        commerce.fund(jobId, BUDGET, "");
        vm.stopPrank();

        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.WrongJobState.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testOutcomeMustMatchImmutableThresholds() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        verdict.score = 7_999;
        bytes memory signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.OutcomePolicyMismatch.selector);
        evaluator.proposeVerdict(verdict, signature);

        verdict.score = 9_000;
        verdict.outcome = ScopeSettleEvaluator.Outcome.Fail;
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.OutcomePolicyMismatch.selector);
        evaluator.proposeVerdict(verdict, signature);

        verdict.outcome = ScopeSettleEvaluator.Outcome.Pass;
        verdict.confidence = 7_499;
        signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.OutcomePolicyMismatch.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testManualReviewCanRepresentAmbiguity() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.ManualReview, 1);
        verdict.confidence = 1;
        evaluator.proposeVerdict(verdict, _sign(verdict, SIGNER_KEY));
        assertEq(evaluator.getProposal(jobId).challengeUntil, 0);

        vm.prank(reviewer);
        evaluator.resolveManualReview(jobId, true, keccak256("human review"));
        assertEq(token.balanceOf(provider), BUDGET);
    }

    function testRequiresEnoughTimeForChallengeWindow() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 2 days, 1 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signature = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.InsufficientChallengeTime.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testChallengeAuthorizationReasonAndBoundary() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);

        vm.prank(stranger);
        vm.expectRevert(ScopeSettleEvaluator.Unauthorized.selector);
        evaluator.challenge(jobId, keccak256("reason"));

        vm.prank(client);
        vm.expectRevert(ScopeSettleEvaluator.InvalidCommitment.selector);
        evaluator.challenge(jobId, bytes32(0));

        uint64 boundary = evaluator.getProposal(jobId).challengeUntil;
        vm.warp(boundary);
        vm.prank(provider);
        vm.expectRevert(ScopeSettleEvaluator.ChallengeClosed.selector);
        evaluator.challenge(jobId, keccak256("too late"));
    }

    function testClientCanChallengeAndOnlyReviewerCanResolve() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        vm.prank(client);
        evaluator.challenge(jobId, keccak256("missing edge case"));

        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(ScopeSettleEvaluator.NotFinalizable.selector);
        evaluator.finalize(jobId);
        vm.prank(stranger);
        vm.expectRevert(ScopeSettleEvaluator.Unauthorized.selector);
        evaluator.resolveManualReview(jobId, false, keccak256("review"));

        vm.prank(reviewer);
        evaluator.resolveManualReview(jobId, false, keccak256("review"));
        assertEq(token.balanceOf(client), 1_000_000e6);
        assertEq(
            uint256(commerce.getJob(jobId).status), uint256(IAgenticCommerce.JobStatus.Rejected)
        );
    }

    function testFinalizePassAtExactBoundary() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        uint64 boundary = evaluator.getProposal(jobId).challengeUntil;

        vm.warp(boundary - 1);
        vm.expectRevert(ScopeSettleEvaluator.NotFinalizable.selector);
        evaluator.finalize(jobId);
        vm.warp(boundary);
        vm.prank(stranger);
        evaluator.finalize(jobId);

        assertEq(token.balanceOf(provider), BUDGET);
        assertEq(
            uint256(commerce.getJob(jobId).status), uint256(IAgenticCommerce.JobStatus.Completed)
        );
        vm.expectRevert(ScopeSettleEvaluator.AlreadyFinalized.selector);
        evaluator.finalize(jobId);

        vm.prank(client);
        vm.expectRevert(ScopeSettleEvaluator.AlreadyFinalized.selector);
        evaluator.challenge(jobId, keccak256("late challenge"));
    }

    function testFinalizeFailRefundsClient() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(jobId, ScopeSettleEvaluator.Outcome.Fail, 1);
        vm.warp(evaluator.getProposal(jobId).challengeUntil);
        evaluator.finalize(jobId);
        assertEq(token.balanceOf(client), 1_000_000e6);
    }

    function testExpiryBoundaryMakesFinalizeAndRefundMutuallyExclusive() public {
        uint256 finalizedJob = _createSubmittedFor(address(evaluator), 1 days, 1 days);
        _propose(finalizedJob, ScopeSettleEvaluator.Outcome.Pass, 1);
        uint64 finalizedExpiry = commerce.getJob(finalizedJob).expiredAt;

        vm.warp(finalizedExpiry);
        evaluator.finalize(finalizedJob);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        commerce.claimRefund(finalizedJob);

        uint256 refundedJob = _createSubmittedFor(address(evaluator), 1 days, 1 days);
        _propose(refundedJob, ScopeSettleEvaluator.Outcome.Pass, 2);
        uint64 refundedExpiry = commerce.getJob(refundedJob).expiredAt;

        vm.warp(refundedExpiry);
        commerce.claimRefund(refundedJob);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        evaluator.finalize(refundedJob);

        assertFalse(evaluator.getProposal(refundedJob).finalized);
        assertEq(commerce.escrowedTotal(), 0);
        assertEq(
            uint256(commerce.getJob(finalizedJob).status),
            uint256(IAgenticCommerce.JobStatus.Completed)
        );
        assertEq(
            uint256(commerce.getJob(refundedJob).status),
            uint256(IAgenticCommerce.JobStatus.Expired)
        );
    }

    function testManualResolutionValidationAndFinality() public {
        uint256 automaticJob = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(automaticJob, ScopeSettleEvaluator.Outcome.Pass, 1);
        vm.prank(reviewer);
        vm.expectRevert(ScopeSettleEvaluator.NotFinalizable.selector);
        evaluator.resolveManualReview(automaticJob, true, keccak256("premature"));

        uint256 manualJob = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        _propose(manualJob, ScopeSettleEvaluator.Outcome.ManualReview, 2);
        vm.prank(reviewer);
        vm.expectRevert(ScopeSettleEvaluator.InvalidCommitment.selector);
        evaluator.resolveManualReview(manualJob, true, bytes32(0));

        vm.prank(reviewer);
        evaluator.resolveManualReview(manualJob, true, keccak256("reviewed"));
        vm.prank(reviewer);
        vm.expectRevert(ScopeSettleEvaluator.AlreadyFinalized.selector);
        evaluator.resolveManualReview(manualJob, true, keccak256("again"));
    }

    function testDomainPreventsCrossContractReplay() public {
        ScopeSettleEvaluator other = new ScopeSettleEvaluator(address(commerce), signer, stranger);
        uint256 jobId = _createSubmittedFor(address(other), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signatureForFirstContract = _sign(verdict, SIGNER_KEY);
        vm.expectRevert(ScopeSettleEvaluator.InvalidSignature.selector);
        other.proposeVerdict(verdict, signatureForFirstContract);
    }

    function testDomainPreventsCrossChainReplay() public {
        uint256 jobId = _createSubmittedFor(address(evaluator), 1 days, 7 days);
        ScopeSettleEvaluator.Verdict memory verdict =
            _verdict(jobId, ScopeSettleEvaluator.Outcome.Pass, 1);
        bytes memory signature = _sign(verdict, SIGNER_KEY);
        vm.chainId(block.chainid + 1);
        vm.expectRevert(ScopeSettleEvaluator.InvalidSignature.selector);
        evaluator.proposeVerdict(verdict, signature);
    }

    function testMissingProposalReverts() public {
        vm.expectRevert(ScopeSettleEvaluator.ProposalMissing.selector);
        evaluator.getProposal(99);
    }
}
