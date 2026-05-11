// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {OutcomeToken} from "../tokens/OutcomeToken.sol";
import {PredictionMarket} from "./PredictionMarket.sol";

/// @title MarketFactory
/// @notice Creates prediction markets and tracks all deployed markets.
contract MarketFactory is AccessControl {
    bytes32 public constant MARKET_CREATOR_ROLE = keccak256("MARKET_CREATOR_ROLE");

    IERC20 public immutable collateralToken;
    OutcomeToken public immutable outcomeToken;

    address[] public markets;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 endTime
    );

    constructor(
        IERC20 _collateralToken,
        OutcomeToken _outcomeToken,
        address admin
    ) {
        collateralToken = _collateralToken;
        outcomeToken = _outcomeToken;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARKET_CREATOR_ROLE, admin);
    }

    function createMarket(
        string memory question,
        uint256 endTime,
        uint256 initialYesReserve,
        uint256 initialNoReserve
    ) external onlyRole(MARKET_CREATOR_ROLE) returns (address market) {
        market = address(
            new PredictionMarket(
                collateralToken,
                outcomeToken,
                question,
                endTime,
                initialYesReserve,
                initialNoReserve
            )
        );

        markets.push(market);

        emit MarketCreated(
            market,
            msg.sender,
            question,
            endTime
        );
    }

    function getMarketsCount() external view returns (uint256) {
        return markets.length;
    }
}
