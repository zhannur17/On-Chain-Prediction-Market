const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainlinkResolver", function () {
  let owner;
  let resolver;
  let mockFeed;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const ChainlinkResolver = await ethers.getContractFactory("ChainlinkResolver");
    resolver = await ChainlinkResolver.deploy(owner.address);

    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    mockFeed = await MockAggregator.deploy(8, 3000_00000000);
  });

  it("registers a feed", async function () {
    const marketId = ethers.id("ETH-5000-2026");

    await expect(
      resolver.registerFeed(
        marketId,
        await mockFeed.getAddress(),
        2500_00000000
      )
    ).to.emit(resolver, "FeedRegistered");

    expect(await resolver.feeds(marketId)).to.equal(await mockFeed.getAddress());
  });

  it("resolves market as YES when price is above strike", async function () {
  const marketId = ethers.id("ETH-5000-2026");

  await resolver.registerFeed(
    marketId,
    await mockFeed.getAddress(),
    2500_00000000
  );

  await expect(resolver.resolveMarket(marketId))
    .to.emit(resolver, "MarketResolved");

  const resolution = await resolver.resolutions(marketId);
  expect(resolution.resolved).to.equal(true);
  expect(resolution.outcome).to.equal(true);
});

it("resolves market as NO when price is below strike", async function () {
  const marketId = ethers.id("ETH-5000-2026");

  await resolver.registerFeed(
    marketId,
    await mockFeed.getAddress(),
    3500_00000000
  );

  await expect(resolver.resolveMarket(marketId))
    .to.emit(resolver, "MarketResolved");

  const resolution = await resolver.resolutions(marketId);
  expect(resolution.resolved).to.equal(true);
  expect(resolution.outcome).to.equal(false);
});
});