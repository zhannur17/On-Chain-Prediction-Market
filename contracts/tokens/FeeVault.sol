// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title FeeVault
/// @notice ERC-4626 vault that accumulates trading fees from prediction markets.
///         LP providers deposit collateral and receive vault shares (vPRED).
contract FeeVault is ERC4626, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant FEE_DEPOSITOR_ROLE = keccak256("FEE_DEPOSITOR_ROLE");

    uint256 public totalFeesCollected;

    event FeesDeposited(address indexed market, uint256 amount);

    error ZeroAmount();

    constructor(IERC20 asset, address admin)
        ERC4626(asset)
        ERC20("Prediction Fee Vault", "vPRED")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Called by market contracts to deposit collected fees.
    ///         Increases total assets without minting shares — raises share price.
    function depositFees(uint256 amount) external onlyRole(FEE_DEPOSITOR_ROLE) {
        if (amount == 0) revert ZeroAmount();
        totalFeesCollected += amount;
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        emit FeesDeposited(msg.sender, amount);
    }
}