// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock USDG
/// @notice Valueless local/Testnet token. Never use or describe as a Mainnet asset.
contract MockUSDG is ERC20 {
    uint8 private constant TOKEN_DECIMALS = 6;

    constructor(address initialHolder, uint256 initialSupply) ERC20("Mock USDG", "mUSDG") {
        _mint(initialHolder, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    /// @notice Permissionless faucet for isolated development and public Testnet demos only.
    function faucet(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
