// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ChainlinkResolver
/// @notice Oracle adapter wrapping Chainlink feeds with staleness protection.
///         Resolves binary market outcomes (price > strike → YES wins).
contract ChainlinkResolver is AccessControl {
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    uint256 public constant STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 public constant DISPUTE_WINDOW = 2 hours;

    struct Resolution {
        bool resolved;
        bool outcome;
        uint256 resolvedAt;
        int256 settlePrice;
    }

    mapping(bytes32 => Resolution) public resolutions;
    mapping(bytes32 => address) public feeds;
    mapping(bytes32 => int256) public strikePrices;

    event FeedRegistered(bytes32 indexed marketId, address feed, int256 strikePrice);
    event MarketResolved(bytes32 indexed marketId, bool outcome, int256 settlePrice);

    error FeedNotRegistered(bytes32 marketId);
    error AlreadyResolved(bytes32 marketId);
    error StalePrice(uint256 updatedAt, uint256 threshold);
    error InvalidPrice();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RESOLVER_ROLE, admin);
    }

    function registerFeed(bytes32 marketId, address feed, int256 strikePrice)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        feeds[marketId] = feed;
        strikePrices[marketId] = strikePrice;
        emit FeedRegistered(marketId, feed, strikePrice);
    }

    function resolveMarket(bytes32 marketId) external onlyRole(RESOLVER_ROLE) {
        if (feeds[marketId] == address(0)) revert FeedNotRegistered(marketId);
        if (resolutions[marketId].resolved) revert AlreadyResolved(marketId);

        (, int256 price,, uint256 updatedAt,) =
            AggregatorV3Interface(feeds[marketId]).latestRoundData();

        if (updatedAt < block.timestamp - STALENESS_THRESHOLD)
            revert StalePrice(updatedAt, block.timestamp - STALENESS_THRESHOLD);
        if (price <= 0) revert InvalidPrice();

        bool outcome = price > strikePrices[marketId];

        resolutions[marketId] = Resolution({
            resolved: true,
            outcome: outcome,
            resolvedAt: block.timestamp,
            settlePrice: price
        });

        emit MarketResolved(marketId, outcome, price);
    }

    function isPayoutUnlocked(bytes32 marketId) external view returns (bool) {
        Resolution memory r = resolutions[marketId];
        if (!r.resolved) return false;
        return block.timestamp >= r.resolvedAt + DISPUTE_WINDOW;
    }

    function getOutcome(bytes32 marketId) external view returns (bool) {
        require(resolutions[marketId].resolved, "Not resolved");
        return resolutions[marketId].outcome;
    }
}