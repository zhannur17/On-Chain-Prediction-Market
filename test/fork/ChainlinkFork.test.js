const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Chainlink fork-style tests", function () {
  it("reads ETH/USD price from Chainlink-style mock feed", async function () {
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    const feed = await MockAggregator.deploy(8, 3000_00000000);

    const data = await feed.latestRoundData();

    expect(data[1]).to.equal(3000_00000000);
  });

  it("updates mock feed price like a forked oracle", async function () {
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    const feed = await MockAggregator.deploy(8, 3000_00000000);

    await feed.setAnswer(3500_00000000);

    const data = await feed.latestRoundData();

    expect(data[1]).to.equal(3500_00000000);
  });

  it("detects stale oracle timestamp", async function () {
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    const feed = await MockAggregator.deploy(8, 3000_00000000);

    await feed.setUpdatedAt(1);

    const data = await feed.latestRoundData();

    expect(data[3]).to.equal(1);
  });
});