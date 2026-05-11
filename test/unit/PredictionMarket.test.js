const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let owner, trader;
  let collateral, outcomeToken, market;

  const initialYesReserve = ethers.parseEther("1000");
  const initialNoReserve = ethers.parseEther("1000");

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
      initialYesReserve,
      initialNoReserve
    );

    await outcomeToken.grantRole(
      await outcomeToken.MINTER_ROLE(),
      await market.getAddress()
    );

    await collateral.mint(trader.address, ethers.parseEther("10000"));
  });

  it("sets initial market data correctly", async function () {
    expect(await market.question()).to.equal("Will ETH be above $5000?");
    expect(await market.yesReserve()).to.equal(initialYesReserve);
    expect(await market.noReserve()).to.equal(initialNoReserve);
    expect(await market.state()).to.equal(0);
  });

  it("returns a buy quote for YES shares", async function () {
    const quote = await market.getBuyQuote(true, ethers.parseEther("100"));
    expect(quote).to.be.gt(0);
  });

  it("returns a buy quote for NO shares", async function () {
    const quote = await market.getBuyQuote(false, ethers.parseEther("100"));
    expect(quote).to.be.gt(0);
  });

  it("allows user to buy YES shares", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await expect(
    market.connect(trader).buyShares(true, amountIn, 1)
  ).to.emit(market, "SharesBought");

  const yesBalance = await outcomeToken.balanceOf(
    trader.address,
    await outcomeToken.YES()
  );

  expect(yesBalance).to.be.gt(0);
});

it("allows user to buy NO shares", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await expect(
    market.connect(trader).buyShares(false, amountIn, 1)
  ).to.emit(market, "SharesBought");

  const noBalance = await outcomeToken.balanceOf(
    trader.address,
    await outcomeToken.NO()
  );

  expect(noBalance).to.be.gt(0);
});

it("reverts when buying with zero collateral", async function () {
  await expect(
    market.connect(trader).buyShares(true, 0, 1)
  ).to.be.revertedWithCustomError(market, "ZeroAmount");
});

it("reverts when minimum YES shares is too high", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await expect(
    market.connect(trader).buyShares(true, amountIn, ethers.parseEther("999999"))
  ).to.be.revertedWithCustomError(market, "SlippageExceeded");
});

it("reverts when minimum NO shares is too high", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await expect(
    market.connect(trader).buyShares(false, amountIn, ethers.parseEther("999999"))
  ).to.be.revertedWithCustomError(market, "SlippageExceeded");
});

it("reverts buying after deadline", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine");

  await expect(
    market.connect(trader).buyShares(true, amountIn, 1)
  ).to.be.revertedWithCustomError(market, "DeadlinePassed");
});

it("allows user to sell YES shares", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await market.connect(trader).buyShares(true, amountIn, 1);

  const yesBalance = await outcomeToken.balanceOf(
    trader.address,
    await outcomeToken.YES()
  );

  await expect(
    market.connect(trader).sellShares(true, yesBalance, 1)
  ).to.emit(market, "SharesSold");
});

it("allows user to sell NO shares", async function () {
  const amountIn = ethers.parseEther("100");

  await collateral.connect(trader).approve(await market.getAddress(), amountIn);

  await market.connect(trader).buyShares(false, amountIn, 1);

  const noBalance = await outcomeToken.balanceOf(
    trader.address,
    await outcomeToken.NO()
  );

  await expect(
    market.connect(trader).sellShares(false, noBalance, 1)
  ).to.emit(market, "SharesSold");
});

it("reverts selling zero shares", async function () {
  await expect(
    market.connect(trader).sellShares(true, 0, 1)
  ).to.be.revertedWithCustomError(market, "ZeroAmount");
});
});