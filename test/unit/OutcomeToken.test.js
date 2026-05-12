const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OutcomeToken", function () {
  let owner, user;
  let outcomeToken;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const OutcomeToken = await ethers.getContractFactory("OutcomeToken");
    outcomeToken = await OutcomeToken.deploy(owner.address);

    await outcomeToken.grantRole(
      await outcomeToken.MINTER_ROLE(),
      owner.address
    );
  });

  it("sets token ids correctly", async function () {
    expect(await outcomeToken.YES()).to.equal(0);
    expect(await outcomeToken.NO()).to.equal(1);
  });

  it("allows minter to mint YES tokens", async function () {
    const amount = ethers.parseEther("100");

    await outcomeToken.mint(user.address, await outcomeToken.YES(), amount, "0x");

    expect(
      await outcomeToken.balanceOf(user.address, await outcomeToken.YES())
    ).to.equal(amount);
  });

  it("allows minter to mint NO tokens", async function () {
    const amount = ethers.parseEther("50");

    await outcomeToken.mint(user.address, await outcomeToken.NO(), amount, "0x");

    expect(
      await outcomeToken.balanceOf(user.address, await outcomeToken.NO())
    ).to.equal(amount);
  });

  it("allows minter to burn tokens", async function () {
    const amount = ethers.parseEther("20");

    await outcomeToken.mint(user.address, await outcomeToken.YES(), amount, "0x");
    await outcomeToken.burn(user.address, await outcomeToken.YES(), amount);

    expect(
      await outcomeToken.balanceOf(user.address, await outcomeToken.YES())
    ).to.equal(0);
  });

  it("reverts mint from unauthorized address", async function () {
    await expect(
      outcomeToken
        .connect(user)
        .mint(user.address, await outcomeToken.YES(), ethers.parseEther("10"), "0x")
    ).to.be.reverted;
  });

  it("supports interface detection", async function () {
  expect(
    await outcomeToken.supportsInterface("0xd9b67a26")
  ).to.equal(true);
});

it("allows batch minting logic through multiple mints", async function () {
  const amount = ethers.parseEther("10");

  await outcomeToken.mint(
    user.address,
    await outcomeToken.YES(),
    amount,
    "0x"
  );

  await outcomeToken.mint(
    user.address,
    await outcomeToken.NO(),
    amount,
    "0x"
  );

  expect(
    await outcomeToken.balanceOf(user.address, await outcomeToken.YES())
  ).to.equal(amount);

  expect(
    await outcomeToken.balanceOf(user.address, await outcomeToken.NO())
  ).to.equal(amount);
});
});