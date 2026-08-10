// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { StdInvariant } from "forge-std/StdInvariant.sol";
import { Test } from "forge-std/Test.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { IAgenticCommerce } from "../src/interfaces/IAgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";

contract CommerceHandler is Test {
    uint256 public constant SUPPLY = 1_000_000e6;
    // Test handler getters use role names for readable invariant traces.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable client = makeAddr("invariant-client");
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable provider = makeAddr("invariant-provider");
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable evaluator = makeAddr("invariant-evaluator");

    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    MockUSDG public immutable token;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    AgenticCommerce public immutable commerce;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    uint256 public immutable jobId;

    constructor() {
        token = new MockUSDG(client, SUPPLY);
        commerce = new AgenticCommerce(address(token));
        AgenticCommerce.ScopePolicy memory policy = AgenticCommerce.ScopePolicy({
            specificationHash: keccak256("specification"),
            rubricHash: keccak256("rubric"),
            minimumScore: 8_000,
            minimumConfidence: 7_500,
            challengeWindow: 1 hours
        });
        vm.prank(client);
        jobId = commerce.createScopedJob(
            provider, evaluator, uint64(block.timestamp + 30 days), "invariant job", policy
        );
    }

    function fund(uint96 rawAmount) external {
        if (commerce.getJob(jobId).status != IAgenticCommerce.JobStatus.Open) return;
        uint256 amount = bound(uint256(rawAmount), 1, SUPPLY);
        vm.startPrank(client);
        commerce.setBudget(jobId, amount, "");
        token.approve(address(commerce), amount);
        commerce.fund(jobId, amount, "");
        vm.stopPrank();
    }

    function submit(bytes32 deliverable) external {
        if (commerce.getJob(jobId).status != IAgenticCommerce.JobStatus.Funded) return;
        if (deliverable == bytes32(0)) deliverable = keccak256("nonzero");
        vm.prank(provider);
        commerce.submit(jobId, deliverable, "");
    }

    function complete(bytes32 reason) external {
        if (commerce.getJob(jobId).status != IAgenticCommerce.JobStatus.Submitted) return;
        vm.prank(evaluator);
        commerce.complete(jobId, reason, "");
    }

    function reject(bytes32 reason) external {
        IAgenticCommerce.JobStatus status = commerce.getJob(jobId).status;
        if (status == IAgenticCommerce.JobStatus.Open) {
            vm.prank(client);
            commerce.reject(jobId, reason, "");
        } else if (
            status == IAgenticCommerce.JobStatus.Funded
                || status == IAgenticCommerce.JobStatus.Submitted
        ) {
            vm.prank(evaluator);
            commerce.reject(jobId, reason, "");
        }
    }

    function expire() external {
        IAgenticCommerce.JobStatus status = commerce.getJob(jobId).status;
        if (
            status != IAgenticCommerce.JobStatus.Funded
                && status != IAgenticCommerce.JobStatus.Submitted
        ) return;
        vm.warp(commerce.getJob(jobId).expiredAt);
        commerce.claimRefund(jobId);
    }
}

contract ScopeSettleInvariantTest is StdInvariant, Test {
    CommerceHandler internal handler;

    function setUp() public {
        handler = new CommerceHandler();
        targetContract(address(handler));
    }

    function invariantEscrowBalanceMatchesAccounting() public view {
        assertEq(
            handler.token().balanceOf(address(handler.commerce())),
            handler.commerce().escrowedTotal()
        );
    }

    function invariantTokenSupplyIsConservedAcrossEconomicParties() public view {
        uint256 held = handler.token().balanceOf(handler.client())
            + handler.token().balanceOf(handler.provider())
            + handler.token().balanceOf(address(handler.commerce()));
        assertEq(held, handler.SUPPLY());
    }

    function invariantTerminalStateHasNoEscrow() public view {
        IAgenticCommerce.JobStatus status = handler.commerce().getJob(handler.jobId()).status;
        if (
            status == IAgenticCommerce.JobStatus.Completed
                || status == IAgenticCommerce.JobStatus.Rejected
                || status == IAgenticCommerce.JobStatus.Expired
        ) {
            assertEq(handler.commerce().escrowedTotal(), 0);
            assertEq(handler.token().balanceOf(address(handler.commerce())), 0);
        }
    }
}
