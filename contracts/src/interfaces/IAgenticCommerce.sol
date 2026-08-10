// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Minimal settlement surface used by ScopeSettleEvaluator
interface IAgenticCommerce {
    enum JobStatus {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired
    }

    struct SettlementContext {
        address client;
        address provider;
        address evaluator;
        uint64 expiredAt;
        JobStatus status;
        bytes32 deliverable;
        uint16 minimumScore;
        uint16 minimumConfidence;
        uint32 challengeWindow;
    }

    function settlementContext(uint256 jobId)
        external
        view
        returns (SettlementContext memory context);

    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external;

    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external;
}
