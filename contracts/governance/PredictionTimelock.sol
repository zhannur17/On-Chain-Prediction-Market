// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title PredictionTimelock
/// @notice 2-day timelock controlling treasury and privileged protocol functions.
contract PredictionTimelock is TimelockController {
    uint256 public constant MIN_DELAY = 2 days;

    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    )
        TimelockController(MIN_DELAY, proposers, executors, admin)
    {}
}
