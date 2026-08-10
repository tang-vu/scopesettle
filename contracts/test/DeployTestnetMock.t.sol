// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";

import { DeployTestnetMock } from "../script/DeployTestnetMock.s.sol";
import { AgenticCommerce } from "../src/AgenticCommerce.sol";
import { MockUSDG } from "../src/MockUSDG.sol";
import { ScopeSettleEvaluator } from "../src/ScopeSettleEvaluator.sol";

contract DeployTestnetMockTest is Test {
    function testRevertsOutsideXLayerTestnet() public {
        vm.chainId(196);
        DeployTestnetMock deployment = new DeployTestnetMock();

        vm.expectRevert(abi.encodeWithSelector(DeployTestnetMock.TestnetOnly.selector, 196));
        deployment.run();
    }

    function testDeploysValuelessStackOnXLayerTestnet() public {
        address holder = makeAddr("holder");
        address signer = makeAddr("signer");
        address reviewer = makeAddr("reviewer");
        vm.chainId(1952);
        // forge-lint: disable-next-line(unsafe-cheatcode)
        vm.setEnv("TESTNET_TOKEN_HOLDER", vm.toString(holder));
        // forge-lint: disable-next-line(unsafe-cheatcode)
        vm.setEnv("EVALUATOR_SIGNER_ADDRESS", vm.toString(signer));
        // forge-lint: disable-next-line(unsafe-cheatcode)
        vm.setEnv("REVIEWER_ADDRESS", vm.toString(reviewer));

        DeployTestnetMock deployment = new DeployTestnetMock();
        (MockUSDG token, AgenticCommerce commerce, ScopeSettleEvaluator evaluator) =
            deployment.run();

        assertEq(token.balanceOf(holder), 1_000_000e6);
        assertEq(address(commerce.paymentToken()), address(token));
        assertEq(address(evaluator.commerce()), address(commerce));
        assertEq(evaluator.verdictSigner(), signer);
        assertEq(evaluator.reviewer(), reviewer);
    }
}
