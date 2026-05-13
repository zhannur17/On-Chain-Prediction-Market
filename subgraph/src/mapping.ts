import { BigInt } from "@graphprotocol/graph-ts";

import {
  MarketCreated,
} from "../generated/MarketFactory/MarketFactory";

import {
  SharesBought,
  MarketResolved,
} from "../generated/templates/PredictionMarket/PredictionMarket";

import { PredictionMarket } from "../generated/templates";

import {
  Market,
  Factory,
  Trade,
  Resolution,
} from "../generated/schema";

export function handleMarketCreated(event: MarketCreated): void {
  let market = new Market(event.params.market.toHex());

  market.marketAddress = event.params.market;
  market.creator = event.params.creator;
  market.question = event.params.question;
  market.endTime = event.params.endTime;
  market.createdAt = event.block.timestamp;

  market.save();

  PredictionMarket.create(event.params.market);

  let factory = Factory.load("FACTORY");

  if (factory == null) {
    factory = new Factory("FACTORY");
    factory.marketsCount = BigInt.fromI32(0);
  }

  factory.marketsCount = factory.marketsCount.plus(
    BigInt.fromI32(1)
  );

  factory.save();
}

export function handleSharesBought(
  event: SharesBought
): void {
  let trade = new Trade(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  trade.market = event.address.toHex();
  trade.trader = event.params.buyer;
  trade.outcome = event.params.outcome;
  trade.amountIn = event.params.collateralIn;
  trade.amountOut = event.params.sharesOut;
  trade.fee = event.params.fee;
  trade.blockTimestamp = event.block.timestamp;

  trade.save();
}

export function handleMarketResolved(
  event: MarketResolved
): void {
  let resolution = new Resolution(
    event.transaction.hash.toHex()
  );

  resolution.market = event.address.toHex();
  resolution.winningOutcome = event.params.winningOutcome;
  resolution.blockTimestamp = event.block.timestamp;

  resolution.save();
}