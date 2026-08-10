// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { ScopeSettleEvaluator } from "../src/ScopeSettleEvaluator.sol";

/// @notice Deploys the production contract pair around an already verified payment token.
contract DeployScopeSettle is Script {
    function run() external returns (AgenticCommerce commerce, ScopeSettleEvaluator evaluator) {
        address paymentToken = vm.envAddress("PAYMENT_TOKEN_ADDRESS");
        address evaluatorSigner = vm.envAddress("EVALUATOR_SIGNER_ADDRESS");
        address reviewer = vm.envAddress("REVIEWER_ADDRESS");

        vm.startBroadcast();
        commerce = new AgenticCommerce(paymentToken);
        evaluator = new ScopeSettleEvaluator(address(commerce), evaluatorSigner, reviewer);
        vm.stopBroadcast();
    }
}
