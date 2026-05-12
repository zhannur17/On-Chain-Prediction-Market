const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MarketFactory", function () {
  let owner, other;
  let collateral, outcomeToken, factory;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const MockCollateral = await ethers.getContractFactory("MockCollateral");
    collateral = await MockCollateral.deploy();

    const OutcomeToken = await ethers.getContractFactory("OutcomeToken");
    outcomeToken = await OutcomeToken.deploy(owner.address);

    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    factory = await MarketFactory.deploy(
      await collateral.getAddress(),
      await outcomeToken.getAddress(),
      owner.address
    );
  });

  it("sets initial factory data correctly", async function () {
    expect(await factory.collateralToken()).to.equal(await collateral.getAddress());
    expect(await factory.outcomeToken()).to.equal(await outcomeToken.getAddress());
    expect(await factory.getMarketsCount()).to.equal(0);
  });

  it("creates a new prediction market", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

    await expect(
      factory.createMarket(
        "Will BTC be above $100000?",
        endTime,
        ethers.parseEther("1000"),
        ethers.parseEther("1000")
      )
    ).to.emit(factory, "MarketCreated");

    expect(await factory.getMarketsCount()).to.equal(1);
  });

  it("reverts when non-creator tries to create market", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

    await expect(
      factory.connect(other).createMarket(
        "Will BTC be above $100000?",
        endTime,
        ethers.parseEther("1000"),
        ethers.parseEther("1000")
      )
    ).to.be.reverted;
  });

  it("stores created market address", async function () {
  const latestBlock = await ethers.provider.getBlock("latest");
  const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

  await factory.createMarket(
    "Will ETH be above $5000?",
    endTime,
    ethers.parseEther("1000"),
    ethers.parseEther("1000")
  );

  const marketAddress = await factory.markets(0);

  expect(marketAddress).to.not.equal(ethers.ZeroAddress);
});

it("creates multiple markets", async function () {
  const latestBlock = await ethers.provider.getBlock("latest");
  const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

  await factory.createMarket(
    "Market 1",
    endTime,
    ethers.parseEther("1000"),
    ethers.parseEther("1000")
  );

  await factory.createMarket(
    "Market 2",
    endTime,
    ethers.parseEther("1000"),
    ethers.parseEther("1000")
  );

  expect(await factory.getMarketsCount()).to.equal(2);
});

it("reverts when creating market with zero YES reserve", async function () {
  const latestBlock = await ethers.provider.getBlock("latest");
  const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

  await expect(
    factory.createMarket(
      "Invalid market",
      endTime,
      0,
      ethers.parseEther("1000")
    )
  ).to.be.revertedWithCustomError(
    await ethers.getContractAt(
      "PredictionMarket",
      ethers.ZeroAddress
    ),
    "InvalidInitialReserve"
  );
});

it("creates market deterministically with CREATE2", async function () {
  const latestBlock = await ethers.provider.getBlock("latest");
  const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;
  const salt = ethers.id("market-1");

  const predicted = await factory.predictMarketAddress(
    salt,
    "CREATE2 market",
    endTime,
    ethers.parseEther("1000"),
    ethers.parseEther("1000")
  );

  await factory.createMarketDeterministic(
    "CREATE2 market",
    endTime,
    ethers.parseEther("1000"),
    ethers.parseEther("1000"),
    salt
  );

  expect(await factory.markets(0)).to.equal(predicted);
  expect(await factory.predictedMarkets(salt)).to.equal(predicted);
});
});