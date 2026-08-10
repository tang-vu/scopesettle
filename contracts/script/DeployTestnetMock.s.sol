// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";

import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";
import { ScopeSettleEvaluator } from "../src/ScopeSettleEvaluator.sol";

/// @notice Deploys the beta stack with a valueless faucet token exclusively on X Layer Testnet.
/// @dev The chain guard makes this script unusable on X Layer Mainnet even if invoked by mistake.
contract DeployTestnetMock is Script {
    uint256 internal constant X_LAYER_TESTNET_CHAIN_ID = 1952;

    error TestnetOnly(uint256 actualChainId);

    function run()
        external
        returns (MockUSDG token, AgenticCommerce commerce, ScopeSettleEvaluator evaluator)
    {
        if (block.chainid != X_LAYER_TESTNET_CHAIN_ID) {
            revert TestnetOnly(block.chainid);
        }

        address initialHolder = vm.envAddress("TESTNET_TOKEN_HOLDER");
        address evaluatorSigner = vm.envAddress("EVALUATOR_SIGNER_ADDRESS");
        address reviewer = vm.envAddress("REVIEWER_ADDRESS");

        vm.startBroadcast();
        token = new MockUSDG(initialHolder, 1_000_000e6);
        commerce = new AgenticCommerce(address(token));
        evaluator = new ScopeSettleEvaluator(address(commerce), evaluatorSigner, reviewer);
        vm.stopBroadcast();

        console2.log("MockUSDG (valueless Testnet token):", address(token));
        console2.log("AgenticCommerce:", address(commerce));
        console2.log("ScopeSettleEvaluator:", address(evaluator));
    }
}
