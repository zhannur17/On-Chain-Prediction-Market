const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceToken", function () {
  let owner, user;
  let token;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    token = await GovernanceToken.deploy(owner.address);
  });

it("sets token metadata correctly", async function () {
  expect(await token.name()).to.equal("PredictToken");
  expect(await token.symbol()).to.equal("PRED");
});

  it("mints initial supply to owner", async function () {
    const balance = await token.balanceOf(owner.address);

    expect(balance).to.be.gt(0);
  });

  it("allows delegation", async function () {
    await token.delegate(user.address);

    expect(await token.delegates(owner.address)).to.equal(user.address);
  });

  it("tracks voting power after delegation", async function () {
    await token.delegate(owner.address);

    const votes = await token.getVotes(owner.address);

    expect(votes).to.be.gt(0);
  });

  it("transfers tokens correctly", async function () {
    const amount = ethers.parseEther("100");

    await token.transfer(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount);
  });
});