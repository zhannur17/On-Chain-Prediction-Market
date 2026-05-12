const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket invariant tests", function () {
  let owner, trader;
  let collateral, outcomeToken, market;

  beforeEach(async function () {
    [owner, trader] = await ethers.getSigners();

    const MockCollateral = await ethers.getContractFactory("MockCollateral");
    collateral = await MockCollateral.deploy();

    const OutcomeToken = await ethers.getContractFactory("OutcomeToken");
    outcomeToken = await OutcomeToken.deploy(owner.address);

    const latestBlock = await ethers.provider.getBlock("latest");
    const endTime = latestBlock.timestamp + 7 * 24 * 60 * 60;

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy(
      await collateral.getAddress(),
      await outcomeToken.getAddress(),
      "Will ETH be above $5000?",
      endTime,
      ethers.parseEther("1000"),
      ethers.parseEther("1000")
    );

    await outcomeToken.grantRole(
      await outcomeToken.MINTER_ROLE(),
      await market.getAddress()
    );

    await collateral.mint(trader.address, ethers.parseEther("1000000"));
  });

  it("invariant: reserves are always greater than zero after buy YES", async function () {
    const amountIn = ethers.parseEther("100");

    await collateral.connect(trader).approve(await market.getAddress(), amountIn);
    await market.connect(trader).buyShares(true, amountIn, 1);

    expect(await market.yesReserve()).to.be.gt(0);
    expect(await market.noReserve()).to.be.gt(0);
  });

  it("invariant: reserves are always greater than zero after buy NO", async function () {
    const amountIn = ethers.parseEther("100");

    await collateral.connect(trader).approve(await market.getAddress(), amountIn);
    await market.connect(trader).buyShares(false, amountIn, 1);

    expect(await market.yesReserve()).to.be.gt(0);
    expect(await market.noReserve()).to.be.gt(0);
  });

  it("invariant: k does not decrease after YES buy", async function () {
    const beforeK = (await market.yesReserve()) * (await market.noReserve());

    const amountIn = ethers.parseEther("100");
    await collateral.connect(trader).approve(await market.getAddress(), amountIn);
    await market.connect(trader).buyShares(true, amountIn, 1);

    const afterK = (await market.yesReserve()) * (await market.noReserve());

    expect(afterK).to.be.gte(beforeK);
  });

  it("invariant: k does not decrease after NO buy", async function () {
    const beforeK = (await market.yesReserve()) * (await market.noReserve());

    const amountIn = ethers.parseEther("100");
    await collateral.connect(trader).approve(await market.getAddress(), amountIn);
    await market.connect(trader).buyShares(false, amountIn, 1);

    const afterK = (await market.yesReserve()) * (await market.noReserve());

    expect(afterK).to.be.gte(beforeK);
  });

  it("invariant: market state remains Open after normal buys", async function () {
    const amountIn = ethers.parseEther("50");

    await collateral.connect(trader).approve(await market.getAddress(), amountIn);
    await market.connect(trader).buyShares(true, amountIn, 1);

    expect(await market.state()).to.equal(0);
  });
});