// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {OutcomeToken} from "../tokens/OutcomeToken.sol";

/// @title PredictionMarket
/// @notice Binary YES/NO prediction market using constant-product AMM.
contract PredictionMarket is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    enum MarketState {
        Open,
        Resolved,
        Cancelled
    }

    IERC20 public immutable collateralToken;
    OutcomeToken public immutable outcomeToken;

    string public question;
    uint256 public endTime;

    uint256 public yesReserve;
    uint256 public noReserve;

    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS = 10_000;

    MarketState public state;
    bool public winningOutcome;

    event SharesBought(
        address indexed buyer,
        bool indexed outcome,
        uint256 collateralIn,
        uint256 sharesOut,
        uint256 fee
    );

    event SharesSold(
        address indexed seller,
        bool indexed outcome,
        uint256 sharesIn,
        uint256 collateralOut,
        uint256 fee
    );

    event MarketResolved(bool indexed winningOutcome);
    event MarketCancelled();

    error MarketNotOpen();
    error MarketNotResolved();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error ZeroAmount();
    error SlippageExceeded();
    error InvalidInitialReserve();

    constructor(
        IERC20 _collateralToken,
        OutcomeToken _outcomeToken,
        string memory _question,
        uint256 _endTime,
        uint256 _initialYesReserve,
        uint256 _initialNoReserve
    ) {
        if (_initialYesReserve == 0 || _initialNoReserve == 0) {
            revert InvalidInitialReserve();
        }

        collateralToken = _collateralToken;
        outcomeToken = _outcomeToken;
        question = _question;
        endTime = _endTime;
        yesReserve = _initialYesReserve;
        noReserve = _initialNoReserve;
        state = MarketState.Open;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RESOLVER_ROLE, msg.sender);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        uint256 amountInWithFee = (amountIn * (BPS - FEE_BPS)) / BPS;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }

    function getBuyQuote(
        bool outcome,
        uint256 collateralIn
    ) external view returns (uint256 sharesOut) {
        if (outcome) {
            return getAmountOut(collateralIn, noReserve, yesReserve);
        }

        return getAmountOut(collateralIn, yesReserve, noReserve);
    }

    function buyShares(
        bool outcome,
        uint256 collateralIn,
        uint256 minSharesOut
    ) external nonReentrant returns (uint256 sharesOut) {
        if (state != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp >= endTime) revert DeadlinePassed();
        if (collateralIn == 0) revert ZeroAmount();

        uint256 fee = (collateralIn * FEE_BPS) / BPS;

        if (outcome) {
            sharesOut = getAmountOut(collateralIn, noReserve, yesReserve);
            if (sharesOut < minSharesOut) revert SlippageExceeded();

            noReserve += collateralIn - fee;
            yesReserve -= sharesOut;

            outcomeToken.mint(msg.sender, outcomeToken.YES(), sharesOut, "");
        } else {
            sharesOut = getAmountOut(collateralIn, yesReserve, noReserve);
            if (sharesOut < minSharesOut) revert SlippageExceeded();

            yesReserve += collateralIn - fee;
            noReserve -= sharesOut;

            outcomeToken.mint(msg.sender, outcomeToken.NO(), sharesOut, "");
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn);

        emit SharesBought(msg.sender, outcome, collateralIn, sharesOut, fee);
    }

    function sellShares(
        bool outcome,
        uint256 sharesIn,
        uint256 minCollateralOut
    ) external nonReentrant returns (uint256 collateralOut) {
        if (state != MarketState.Open) revert MarketNotOpen();
        if (sharesIn == 0) revert ZeroAmount();

        uint256 fee;

        if (outcome) {
            collateralOut = getAmountOut(sharesIn, yesReserve, noReserve);

            fee = (collateralOut * FEE_BPS) / BPS;
            collateralOut -= fee;

            if (collateralOut < minCollateralOut) revert SlippageExceeded();

            yesReserve += sharesIn;
            noReserve -= collateralOut;

            outcomeToken.burn(msg.sender, outcomeToken.YES(), sharesIn);
        } else {
            collateralOut = getAmountOut(sharesIn, noReserve, yesReserve);

            fee = (collateralOut * FEE_BPS) / BPS;
            collateralOut -= fee;

            if (collateralOut < minCollateralOut) revert SlippageExceeded();

            noReserve += sharesIn;
            yesReserve -= collateralOut;

            outcomeToken.burn(msg.sender, outcomeToken.NO(), sharesIn);
        }

        collateralToken.safeTransfer(msg.sender, collateralOut);

        emit SharesSold(msg.sender, outcome, sharesIn, collateralOut, fee);
    }

    function resolveMarket(
        bool _winningOutcome
    ) external onlyRole(RESOLVER_ROLE) {
        if (block.timestamp < endTime) revert DeadlineNotPassed();
        if (state != MarketState.Open) revert MarketNotOpen();

        state = MarketState.Resolved;
        winningOutcome = _winningOutcome;

        emit MarketResolved(_winningOutcome);
    }

    function claimPayout() external nonReentrant {
        if (state != MarketState.Resolved) revert MarketNotResolved();

        uint256 winningTokenId = winningOutcome
            ? outcomeToken.YES()
            : outcomeToken.NO();

        uint256 balance = outcomeToken.balanceOf(msg.sender, winningTokenId);

        if (balance == 0) revert ZeroAmount();

        outcomeToken.burn(msg.sender, winningTokenId, balance);

        collateralToken.safeTransfer(msg.sender, balance);
    }
}