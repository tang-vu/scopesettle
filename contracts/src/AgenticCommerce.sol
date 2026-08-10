// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IAgenticCommerce } from "./interfaces/IAgenticCommerce.sol";

/// @title ScopeSettle Agentic Commerce escrow
/// @notice A zero-fee, non-upgradeable implementation of the ERC-8183 draft lifecycle.
/// @dev One immutable ERC-20 is supported. Fee-on-transfer and rebasing assets are rejected.
contract AgenticCommerce is IAgenticCommerce, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint32 public constant MAX_CHALLENGE_WINDOW = 30 days;
    uint16 public constant BPS = 10_000;

    struct ScopePolicy {
        bytes32 specificationHash;
        bytes32 rubricHash;
        uint16 minimumScore;
        uint16 minimumConfidence;
        uint32 challengeWindow;
    }

    struct Job {
        uint256 id;
        address client;
        address provider;
        address evaluator;
        string description;
        uint256 budget;
        uint64 expiredAt;
        JobStatus status;
        address hook;
        bytes32 deliverable;
        ScopePolicy policy;
    }

    // Lower camel case intentionally preserves the ergonomic public ABI getter.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable paymentToken;
    uint256 public jobCounter;
    uint256 public escrowedTotal;

    mapping(uint256 jobId => Job job) private _jobs;

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed provider,
        address evaluator,
        uint256 expiredAt,
        address hook
    );
    event ScopeCommitted(
        uint256 indexed jobId,
        bytes32 indexed specificationHash,
        bytes32 indexed rubricHash,
        uint16 minimumScore,
        uint16 minimumConfidence,
        uint32 challengeWindow
    );
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event BudgetSet(uint256 indexed jobId, uint256 amount);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);

    error InvalidJob();
    error WrongStatus(JobStatus expected, JobStatus actual);
    error Unauthorized();
    error ZeroAddress();
    error InvalidExpiry();
    error ZeroBudget();
    error ProviderNotSet();
    error BudgetChanged(uint256 expected, uint256 actual);
    error UnsupportedHook();
    error InvalidCommitment();
    error InvalidThreshold();
    error InvalidChallengeWindow();
    error UnsupportedPaymentToken();

    /// @param paymentToken_ Immutable ERC-20 used for every job in this deployment.
    constructor(address paymentToken_) {
        if (paymentToken_ == address(0)) revert ZeroAddress();
        paymentToken = IERC20(paymentToken_);
    }

    /// @notice Creates a minimal ERC-8183 job without a ScopeSettle policy.
    /// @dev Nonzero hooks are deliberately unsupported to keep refund liveness auditable.
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external returns (uint256 jobId) {
        if (expiredAt > type(uint64).max) revert InvalidExpiry();
        ScopePolicy memory emptyPolicy;
        // Safe because the preceding bound check proves the value fits in uint64.
        // forge-lint: disable-next-line(unsafe-typecast)
        jobId = _createJob(provider, evaluator, uint64(expiredAt), description, hook, emptyPolicy);
    }

    /// @notice Atomically creates a job and commits its immutable ScopeSettle policy.
    function createScopedJob(
        address provider,
        address evaluator,
        uint64 expiredAt,
        string calldata description,
        ScopePolicy calldata policy
    ) external returns (uint256 jobId) {
        if (policy.specificationHash == bytes32(0) || policy.rubricHash == bytes32(0)) {
            revert InvalidCommitment();
        }
        if (policy.minimumScore > BPS || policy.minimumConfidence > BPS) {
            revert InvalidThreshold();
        }
        if (policy.challengeWindow == 0 || policy.challengeWindow > MAX_CHALLENGE_WINDOW) {
            revert InvalidChallengeWindow();
        }

        jobId = _createJob(provider, evaluator, expiredAt, description, address(0), policy);
        emit ScopeCommitted(
            jobId,
            policy.specificationHash,
            policy.rubricHash,
            policy.minimumScore,
            policy.minimumConfidence,
            policy.challengeWindow
        );
    }

    function _createJob(
        address provider,
        address evaluator,
        uint64 expiredAt,
        string calldata description,
        address hook,
        ScopePolicy memory policy
    ) internal returns (uint256 jobId) {
        if (evaluator == address(0)) revert ZeroAddress();
        if (expiredAt <= block.timestamp) revert InvalidExpiry();
        if (hook != address(0)) revert UnsupportedHook();

        jobId = ++jobCounter;
        _jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            provider: provider,
            evaluator: evaluator,
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: address(0),
            deliverable: bytes32(0),
            policy: policy
        });

        emit JobCreated(jobId, msg.sender, provider, evaluator, expiredAt, address(0));
    }

    /// @notice Sets a provider once when a job was created without one.
    function setProvider(uint256 jobId, address provider, bytes calldata) external {
        Job storage job = _requireJob(jobId);
        _requireStatus(job, JobStatus.Open);
        if (msg.sender != job.client) revert Unauthorized();
        if (job.provider != address(0) || provider == address(0)) revert ZeroAddress();
        job.provider = provider;
        emit ProviderSet(jobId, provider);
    }

    /// @notice Client or assigned provider proposes the budget while the job is open.
    function setBudget(uint256 jobId, uint256 amount, bytes calldata) external {
        Job storage job = _requireJob(jobId);
        _requireStatus(job, JobStatus.Open);
        if (msg.sender != job.client && msg.sender != job.provider) revert Unauthorized();
        job.budget = amount;
        emit BudgetSet(jobId, amount);
    }

    /// @notice Pulls the agreed budget from the client into escrow.
    /// @param expectedBudget Protects the client from a changed budget in the mempool.
    function fund(uint256 jobId, uint256 expectedBudget, bytes calldata) external nonReentrant {
        Job storage job = _requireJob(jobId);
        _requireStatus(job, JobStatus.Open);
        if (msg.sender != job.client) revert Unauthorized();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (job.budget != expectedBudget) revert BudgetChanged(expectedBudget, job.budget);

        uint256 balanceBefore = paymentToken.balanceOf(address(this));
        job.status = JobStatus.Funded;
        escrowedTotal += job.budget;
        paymentToken.safeTransferFrom(job.client, address(this), job.budget);
        if (paymentToken.balanceOf(address(this)) - balanceBefore != job.budget) {
            revert UnsupportedPaymentToken();
        }

        emit JobFunded(jobId, job.client, job.budget);
    }

    /// @notice Commits the provider's exact offchain deliverable reference.
    function submit(uint256 jobId, bytes32 deliverable, bytes calldata) external {
        Job storage job = _requireJob(jobId);
        _requireStatus(job, JobStatus.Funded);
        if (msg.sender != job.provider) revert Unauthorized();
        if (deliverable == bytes32(0)) revert InvalidCommitment();
        job.deliverable = deliverable;
        job.status = JobStatus.Submitted;
        emit JobSubmitted(jobId, msg.sender, deliverable);
    }

    /// @notice Releases escrow to the provider after evaluator attestation.
    function complete(uint256 jobId, bytes32 reason, bytes calldata) external nonReentrant {
        Job storage job = _requireJob(jobId);
        _requireStatus(job, JobStatus.Submitted);
        if (msg.sender != job.evaluator) revert Unauthorized();

        uint256 amount = job.budget;
        job.status = JobStatus.Completed;
        escrowedTotal -= amount;
        paymentToken.safeTransfer(job.provider, amount);

        emit JobCompleted(jobId, msg.sender, reason);
        emit PaymentReleased(jobId, job.provider, amount);
    }

    /// @notice Rejects an open job by the client or funded/submitted job by its evaluator.
    function reject(uint256 jobId, bytes32 reason, bytes calldata) external nonReentrant {
        Job storage job = _requireJob(jobId);
        JobStatus previous = job.status;
        if (previous == JobStatus.Open) {
            if (msg.sender != job.client) revert Unauthorized();
        } else if (previous == JobStatus.Funded || previous == JobStatus.Submitted) {
            if (msg.sender != job.evaluator) revert Unauthorized();
        } else {
            revert WrongStatus(JobStatus.Open, previous);
        }

        job.status = JobStatus.Rejected;
        if (previous == JobStatus.Funded || previous == JobStatus.Submitted) {
            escrowedTotal -= job.budget;
            paymentToken.safeTransfer(job.client, job.budget);
            emit Refunded(jobId, job.client, job.budget);
        }
        emit JobRejected(jobId, msg.sender, reason);
    }

    /// @notice Permissionlessly refunds an expired funded or submitted job.
    function claimRefund(uint256 jobId) external nonReentrant {
        Job storage job = _requireJob(jobId);
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) {
            revert WrongStatus(JobStatus.Funded, job.status);
        }
        if (block.timestamp < job.expiredAt) revert InvalidExpiry();

        job.status = JobStatus.Expired;
        escrowedTotal -= job.budget;
        paymentToken.safeTransfer(job.client, job.budget);

        emit Refunded(jobId, job.client, job.budget);
        emit JobExpired(jobId);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        Job storage job = _requireJob(jobId);
        return job;
    }

    function settlementContext(uint256 jobId)
        external
        view
        returns (SettlementContext memory context)
    {
        Job storage job = _requireJob(jobId);
        context = SettlementContext({
            client: job.client,
            provider: job.provider,
            evaluator: job.evaluator,
            expiredAt: job.expiredAt,
            status: job.status,
            deliverable: job.deliverable,
            minimumScore: job.policy.minimumScore,
            minimumConfidence: job.policy.minimumConfidence,
            challengeWindow: job.policy.challengeWindow
        });
    }

    function _requireJob(uint256 jobId) internal view returns (Job storage job) {
        job = _jobs[jobId];
        if (job.id == 0) revert InvalidJob();
    }

    function _requireStatus(Job storage job, JobStatus expected) internal view {
        if (job.status != expected) revert WrongStatus(expected, job.status);
    }
}
