// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MathUtils
/// @notice Compares pure Solidity and inline Yul multiplication.
contract MathUtils {
    function multiplySolidity(uint256 x, uint256 y)
        external
        pure
        returns (uint256)
    {
        return x * y;
    }

    function multiplyYul(uint256 x, uint256 y)
        external
        pure
        returns (uint256 result)
    {
        assembly {
            result := mul(x, y)
        }
    }
}