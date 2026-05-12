const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket fuzz tests", function () {
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

  const testAmounts = [
    1, 5, 10, 25, 50,
    100, 250, 500, 1000, 5000
  ];

  for (const amount of testAmounts) {
    it(`fuzz buy YES with amount ${amount}`, async function () {
      const amountIn = ethers.parseEther(amount.toString());

      await collateral
        .connect(trader)
        .approve(await market.getAddress(), amountIn);

      await expect(
        market.connect(trader).buyShares(true, amountIn, 1)
      ).to.emit(market, "SharesBought");
    });
  }
});