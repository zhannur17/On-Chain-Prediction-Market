const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeeVault", function () {
  let owner, depositor, user;
  let collateral, vault;

  beforeEach(async function () {
    [owner, depositor, user] = await ethers.getSigners();

    const MockCollateral = await ethers.getContractFactory("MockCollateral");
    collateral = await MockCollateral.deploy();

    const FeeVault = await ethers.getContractFactory("FeeVault");
    vault = await FeeVault.deploy(
      await collateral.getAddress(),
      owner.address
    );

    await vault.grantRole(
      await vault.FEE_DEPOSITOR_ROLE(),
      depositor.address
    );

    await collateral.mint(depositor.address, ethers.parseEther("1000"));
    await collateral.mint(user.address, ethers.parseEther("1000"));
  });

  it("sets vault metadata correctly", async function () {
    expect(await vault.name()).to.equal("Prediction Fee Vault");
    expect(await vault.symbol()).to.equal("vPRED");
    expect(await vault.asset()).to.equal(await collateral.getAddress());
  });

  it("allows users to deposit assets and receive shares", async function () {
    const amount = ethers.parseEther("100");

    await collateral.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount, user.address);

    expect(await vault.balanceOf(user.address)).to.equal(amount);
  });

  it("allows fee depositor to deposit fees", async function () {
    const amount = ethers.parseEther("50");

    await collateral.connect(depositor).approve(await vault.getAddress(), amount);

    await expect(
      vault.connect(depositor).depositFees(amount)
    ).to.emit(vault, "FeesDeposited");

    expect(await vault.totalFeesCollected()).to.equal(amount);
  });

  it("reverts fee deposit with zero amount", async function () {
    await expect(
      vault.connect(depositor).depositFees(0)
    ).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("reverts fee deposit from unauthorized address", async function () {
    const amount = ethers.parseEther("50");

    await collateral.connect(user).approve(await vault.getAddress(), amount);

    await expect(
      vault.connect(user).depositFees(amount)
    ).to.be.reverted;
  });
});