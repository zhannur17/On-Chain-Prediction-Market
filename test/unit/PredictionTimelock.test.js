const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionTimelock", function () {
  let owner, proposer, executor;
  let timelock;

  beforeEach(async function () {
    [owner, proposer, executor] = await ethers.getSigners();

    const PredictionTimelock = await ethers.getContractFactory("PredictionTimelock");

    timelock = await PredictionTimelock.deploy(
      [proposer.address],
      [executor.address],
      owner.address
    );
  });

  it("sets minimum delay to 2 days", async function () {
    expect(await timelock.getMinDelay()).to.equal(2 * 24 * 60 * 60);
  });

  it("grants proposer role", async function () {
    const role = await timelock.PROPOSER_ROLE();

    expect(await timelock.hasRole(role, proposer.address)).to.equal(true);
  });

  it("grants executor role", async function () {
    const role = await timelock.EXECUTOR_ROLE();

    expect(await timelock.hasRole(role, executor.address)).to.equal(true);
  });

  it("grants admin role", async function () {
    const role = await timelock.DEFAULT_ADMIN_ROLE();

    expect(await timelock.hasRole(role, owner.address)).to.equal(true);
  });
});