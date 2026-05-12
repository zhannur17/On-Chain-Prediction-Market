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

  it("allows owner to mint tokens", async function () {
  const amount = ethers.parseEther("1000");

  await token.mint(user.address, amount);

  expect(await token.balanceOf(user.address)).to.equal(amount);
});

it("reverts minting above max supply", async function () {
  const maxSupply = await token.MAX_SUPPLY();
  const currentSupply = await token.totalSupply();

  await expect(
    token.mint(user.address, maxSupply - currentSupply + 1n)
  ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
});

it("reverts mint from non-owner", async function () {
  await expect(
    token.connect(user).mint(user.address, ethers.parseEther("1"))
  ).to.be.reverted;
});
});