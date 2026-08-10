// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";
import { ScopeSettleEvaluator } from "../src/ScopeSettleEvaluator.sol";

/// @notice Local Anvil-only deployment with an explicitly valueless mock token.
contract DeployLocal is Script {
    function run()
        external
        returns (MockUSDG token, AgenticCommerce commerce, ScopeSettleEvaluator evaluator)
    {
        address initialHolder = vm.envAddress("LOCAL_TOKEN_HOLDER");
        address evaluatorSigner = vm.envAddress("EVALUATOR_SIGNER_ADDRESS");
        address reviewer = vm.envAddress("REVIEWER_ADDRESS");

        vm.startBroadcast();
        token = new MockUSDG(initialHolder, 1_000_000e6);
        commerce = new AgenticCommerce(address(token));
        evaluator = new ScopeSettleEvaluator(address(commerce), evaluatorSigner, reviewer);
        vm.stopBroadcast();
    }
}
