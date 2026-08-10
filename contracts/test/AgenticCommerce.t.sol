// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Test } from "forge-std/Test.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { IAgenticCommerce } from "../src/interfaces/IAgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";

contract FeeToken is ERC20 {
    constructor(address holder, uint256 amount) ERC20("Fee token", "FEE") {
        _mint(holder, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        return super.transferFrom(from, to, amount - 1);
    }
}

contract ReentrantToken is ERC20 {
    address public target;
    bytes public attackData;
    bool public attackAttempted;
    bool public attackSucceeded;

    constructor(address holder, uint256 amount) ERC20("Reentrant token", "RNT") {
        _mint(holder, amount);
    }

    function configureAttack(address target_, bytes calldata data_) external {
        target = target_;
        attackData = data_;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (!attackAttempted) {
            attackAttempted = true;
            (attackSucceeded,) = target.call(attackData);
        }
        return super.transferFrom(from, to, amount);
    }
}

contract AgenticCommerceTest is Test {
    uint256 internal constant INITIAL_BALANCE = 1_000_000e6;
    uint256 internal constant BUDGET = 500e6;
    bytes32 internal constant SPECIFICATION_HASH = keccak256("specification");
    bytes32 internal constant RUBRIC_HASH = keccak256("rubric");
    bytes32 internal constant DELIVERABLE_HASH = keccak256("deliverable");
    bytes32 internal constant REPORT_HASH = keccak256("report");

    address internal client = makeAddr("client");
    address internal provider = makeAddr("provider");
    address internal evaluator = makeAddr("evaluator");
    address internal stranger = makeAddr("stranger");

    MockUSDG internal token;
    AgenticCommerce internal commerce;

    function setUp() public {
        token = new MockUSDG(client, INITIAL_BALANCE);
        commerce = new AgenticCommerce(address(token));
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

    function _create(address assignedProvider) internal returns (uint256 jobId) {
        vm.prank(client);
        jobId = commerce.createScopedJob(
            assignedProvider,
            evaluator,
            uint64(block.timestamp + 7 days),
            "scopesettle:v1",
            _policy(1 days)
        );
    }

    function _fund(uint256 jobId, uint256 amount) internal {
        vm.startPrank(client);
        commerce.setBudget(jobId, amount, "");
        token.approve(address(commerce), amount);
        commerce.fund(jobId, amount, "");
        vm.stopPrank();
    }

    function _submit(uint256 jobId) internal {
        vm.prank(provider);
        commerce.submit(jobId, DELIVERABLE_HASH, "");
    }

    function testConstructorRejectsZeroToken() public {
        vm.expectRevert(AgenticCommerce.ZeroAddress.selector);
        new AgenticCommerce(address(0));
    }

    function testCreatesScopedJobAndAnchorsPolicy() public {
        uint256 jobId = _create(provider);
        AgenticCommerce.Job memory job = commerce.getJob(jobId);

        assertEq(job.id, 1);
        assertEq(job.client, client);
        assertEq(job.provider, provider);
        assertEq(job.evaluator, evaluator);
        assertEq(job.description, "scopesettle:v1");
        assertEq(job.policy.specificationHash, SPECIFICATION_HASH);
        assertEq(job.policy.rubricHash, RUBRIC_HASH);
        assertEq(job.policy.minimumScore, 8_000);
        assertEq(job.policy.minimumConfidence, 7_500);
        assertEq(job.policy.challengeWindow, 1 days);
        assertEq(uint256(job.status), uint256(IAgenticCommerce.JobStatus.Open));
    }

    function testStandardDraftEntryPointRejectsHooks() public {
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.UnsupportedHook.selector);
        commerce.createJob(provider, evaluator, block.timestamp + 1 days, "description", stranger);
    }

    function testStandardEntryPointRejectsExpiryOutsideUint64() public {
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.InvalidExpiry.selector);
        commerce.createJob(
            provider, evaluator, uint256(type(uint64).max) + 1, "description", address(0)
        );
    }

    function testCreationValidation() public {
        vm.startPrank(client);
        vm.expectRevert(AgenticCommerce.ZeroAddress.selector);
        commerce.createScopedJob(
            provider, address(0), uint64(block.timestamp + 1 days), "description", _policy(1)
        );

        vm.expectRevert(AgenticCommerce.InvalidExpiry.selector);
        commerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp), "description", _policy(1)
        );

        AgenticCommerce.ScopePolicy memory policy = _policy(1);
        policy.specificationHash = bytes32(0);
        vm.expectRevert(AgenticCommerce.InvalidCommitment.selector);
        commerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 1 days), "description", policy
        );

        policy = _policy(1);
        policy.minimumScore = 10_001;
        vm.expectRevert(AgenticCommerce.InvalidThreshold.selector);
        commerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 1 days), "description", policy
        );

        policy = _policy(0);
        vm.expectRevert(AgenticCommerce.InvalidChallengeWindow.selector);
        commerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 1 days), "description", policy
        );
        vm.stopPrank();
    }

    function testSetsInitiallyMissingProviderOnce() public {
        uint256 jobId = _create(address(0));
        vm.prank(client);
        commerce.setProvider(jobId, provider, "");
        assertEq(commerce.getJob(jobId).provider, provider);

        vm.prank(client);
        vm.expectRevert(AgenticCommerce.ZeroAddress.selector);
        commerce.setProvider(jobId, stranger, "");
    }

    function testProviderAssignmentAuthorizationAndValidation() public {
        uint256 jobId = _create(address(0));
        vm.prank(stranger);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.setProvider(jobId, provider, "");

        vm.prank(client);
        vm.expectRevert(AgenticCommerce.ZeroAddress.selector);
        commerce.setProvider(jobId, address(0), "");
    }

    function testClientOrProviderCanSetBudgetAndFundingIsClientAcceptance() public {
        uint256 jobId = _create(provider);
        vm.prank(provider);
        commerce.setBudget(jobId, BUDGET, "");
        assertEq(commerce.getJob(jobId).budget, BUDGET);

        vm.prank(stranger);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.setBudget(jobId, 1, "");

        vm.startPrank(client);
        token.approve(address(commerce), BUDGET);
        vm.expectRevert(
            abi.encodeWithSelector(AgenticCommerce.BudgetChanged.selector, BUDGET - 1, BUDGET)
        );
        commerce.fund(jobId, BUDGET - 1, "");
        commerce.fund(jobId, BUDGET, "");
        vm.stopPrank();

        assertEq(token.balanceOf(address(commerce)), BUDGET);
        assertEq(commerce.escrowedTotal(), BUDGET);
        assertEq(uint256(commerce.getJob(jobId).status), uint256(IAgenticCommerce.JobStatus.Funded));
    }

    function testCannotFundZeroBudgetMissingProviderOrAsStranger() public {
        uint256 jobId = _create(provider);
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.ZeroBudget.selector);
        commerce.fund(jobId, 0, "");

        vm.prank(client);
        commerce.setBudget(jobId, BUDGET, "");
        vm.prank(stranger);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.fund(jobId, BUDGET, "");

        uint256 noProviderJob = _create(address(0));
        vm.prank(client);
        commerce.setBudget(noProviderJob, BUDGET, "");
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.ProviderNotSet.selector);
        commerce.fund(noProviderJob, BUDGET, "");
    }

    function testOnlyProviderSubmitsNonzeroCommitment() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);

        vm.prank(stranger);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.submit(jobId, DELIVERABLE_HASH, "");

        vm.prank(provider);
        vm.expectRevert(AgenticCommerce.InvalidCommitment.selector);
        commerce.submit(jobId, bytes32(0), "");

        _submit(jobId);
        AgenticCommerce.Job memory job = commerce.getJob(jobId);
        assertEq(job.deliverable, DELIVERABLE_HASH);
        assertEq(uint256(job.status), uint256(IAgenticCommerce.JobStatus.Submitted));
    }

    function testCompletionPaysProviderExactlyOnce() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);
        _submit(jobId);

        vm.prank(evaluator);
        commerce.complete(jobId, REPORT_HASH, "");
        assertEq(token.balanceOf(provider), BUDGET);
        assertEq(token.balanceOf(address(commerce)), 0);
        assertEq(commerce.escrowedTotal(), 0);

        vm.prank(evaluator);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        commerce.complete(jobId, REPORT_HASH, "");
    }

    function testCompletionRequiresEvaluatorAndSubmission() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);
        vm.prank(evaluator);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        commerce.complete(jobId, REPORT_HASH, "");

        _submit(jobId);
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.complete(jobId, REPORT_HASH, "");
    }

    function testOpenRejectionAndFundedRejectionAuthorization() public {
        uint256 openJob = _create(provider);
        vm.prank(stranger);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.reject(openJob, REPORT_HASH, "");

        vm.prank(client);
        commerce.reject(openJob, REPORT_HASH, "");
        assertEq(
            uint256(commerce.getJob(openJob).status), uint256(IAgenticCommerce.JobStatus.Rejected)
        );

        uint256 fundedJob = _create(provider);
        _fund(fundedJob, BUDGET);
        vm.prank(client);
        vm.expectRevert(AgenticCommerce.Unauthorized.selector);
        commerce.reject(fundedJob, REPORT_HASH, "");

        vm.prank(evaluator);
        commerce.reject(fundedJob, REPORT_HASH, "");
        assertEq(token.balanceOf(client), INITIAL_BALANCE);
        assertEq(commerce.escrowedTotal(), 0);
    }

    function testSubmittedRejectionRefundsExactlyOnce() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);
        _submit(jobId);
        vm.prank(evaluator);
        commerce.reject(jobId, REPORT_HASH, "");

        assertEq(token.balanceOf(client), INITIAL_BALANCE);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        commerce.claimRefund(jobId);

        vm.prank(evaluator);
        vm.expectPartialRevert(AgenticCommerce.WrongStatus.selector);
        commerce.reject(jobId, REPORT_HASH, "");
    }

    function testExpiryBoundaryIsPermissionless() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);
        uint64 expiry = commerce.getJob(jobId).expiredAt;

        vm.warp(expiry - 1);
        vm.expectRevert(AgenticCommerce.InvalidExpiry.selector);
        commerce.claimRefund(jobId);

        vm.warp(expiry);
        vm.prank(stranger);
        commerce.claimRefund(jobId);
        assertEq(token.balanceOf(client), INITIAL_BALANCE);
        assertEq(
            uint256(commerce.getJob(jobId).status), uint256(IAgenticCommerce.JobStatus.Expired)
        );
    }

    function testSubmittedJobCanExpire() public {
        uint256 jobId = _create(provider);
        _fund(jobId, BUDGET);
        _submit(jobId);
        vm.warp(commerce.getJob(jobId).expiredAt);
        commerce.claimRefund(jobId);
        assertEq(token.balanceOf(client), INITIAL_BALANCE);
        assertEq(token.balanceOf(provider), 0);
    }

    function testRejectsFeeOnTransferToken() public {
        FeeToken feeToken = new FeeToken(client, INITIAL_BALANCE);
        AgenticCommerce feeCommerce = new AgenticCommerce(address(feeToken));
        vm.startPrank(client);
        uint256 jobId = feeCommerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 7 days), "description", _policy(1 days)
        );
        feeCommerce.setBudget(jobId, BUDGET, "");
        feeToken.approve(address(feeCommerce), BUDGET);
        vm.expectRevert(AgenticCommerce.UnsupportedPaymentToken.selector);
        feeCommerce.fund(jobId, BUDGET, "");
        vm.stopPrank();
        assertEq(feeToken.balanceOf(address(feeCommerce)), 0);
        assertEq(feeCommerce.escrowedTotal(), 0);
    }

    function testFundingBlocksReentrancyAttempt() public {
        ReentrantToken reentrantToken = new ReentrantToken(client, INITIAL_BALANCE);
        AgenticCommerce guardedCommerce = new AgenticCommerce(address(reentrantToken));
        vm.startPrank(client);
        uint256 jobId = guardedCommerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 7 days), "description", _policy(1 days)
        );
        guardedCommerce.setBudget(jobId, BUDGET, "");
        reentrantToken.approve(address(guardedCommerce), BUDGET);
        reentrantToken.configureAttack(
            address(guardedCommerce),
            abi.encodeCall(AgenticCommerce.fund, (jobId, BUDGET, bytes("")))
        );
        guardedCommerce.fund(jobId, BUDGET, "");
        vm.stopPrank();

        assertTrue(reentrantToken.attackAttempted());
        assertFalse(reentrantToken.attackSucceeded());
        assertEq(guardedCommerce.escrowedTotal(), BUDGET);
    }

    function testFuzzEscrowConservationOnCompletion(uint96 rawBudget) public {
        uint256 amount = bound(uint256(rawBudget), 1, INITIAL_BALANCE);
        uint256 jobId = _create(provider);
        _fund(jobId, amount);
        _submit(jobId);
        vm.prank(evaluator);
        commerce.complete(jobId, REPORT_HASH, "");

        assertEq(token.balanceOf(client) + token.balanceOf(provider), INITIAL_BALANCE);
        assertEq(token.balanceOf(address(commerce)), commerce.escrowedTotal());
    }

    function testInvalidJobReverts() public {
        vm.expectRevert(AgenticCommerce.InvalidJob.selector);
        commerce.getJob(999);
    }

    function testMockTokenFaucetAndDecimals() public {
        assertEq(token.decimals(), 6);
        token.faucet(stranger, 25e6);
        assertEq(token.balanceOf(stranger), 25e6);
    }
}
