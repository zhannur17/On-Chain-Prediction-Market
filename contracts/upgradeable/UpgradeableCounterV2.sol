// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UpgradeableCounterV1.sol";

contract UpgradeableCounterV2 is UpgradeableCounterV1 {
    function decrement() external {
        require(count > 0, "Count is zero");
        count -= 1;
    }

    function version() external pure returns (string memory) {
        return "V2";
    }
}