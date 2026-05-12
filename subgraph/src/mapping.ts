import { BigInt } from "@graphprotocol/graph-ts";

import {
  MarketCreated
} from "../generated/MarketFactory/MarketFactory";

import {
  Market,
  Factory
} from "../generated/schema";

export function handleMarketCreated(event: MarketCreated): void {
  let market = new Market(event.transaction.hash.toHex());

  market.marketAddress = event.params.market;
  market.creator = event.params.creator;
  market.question = event.params.question;
  market.endTime = event.params.endTime;
  market.createdAt = event.block.timestamp;

  market.save();

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