const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionGovernor", function () {
  let owner;
  let token, timelock, governor;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    token = await GovernanceToken.deploy(owner.address);

    const PredictionTimelock = await ethers.getContractFactory("PredictionTimelock");

    timelock = await PredictionTimelock.deploy(
      [],
      [],
      owner.address
    );

    const PredictionGovernor = await ethers.getContractFactory("PredictionGovernor");

    governor = await PredictionGovernor.deploy(
      await token.getAddress(),
      await timelock.getAddress()
    );
  });

  it("sets correct voting delay", async function () {
    expect(await governor.votingDelay()).to.equal(7200);
  });

  it("sets correct voting period", async function () {
    expect(await governor.votingPeriod()).to.equal(50400);
  });

  it("sets correct proposal threshold", async function () {
    expect(await governor.proposalThreshold()).to.equal(
      ethers.parseEther("1")
    );
  });

  it("sets correct quorum fraction", async function () {
  await token.delegate(owner.address);

  await ethers.provider.send("evm_mine");

  const currentBlock = await ethers.provider.getBlockNumber();
  const quorum = await governor.quorum(currentBlock - 1);

  expect(quorum).to.equal(ethers.parseEther("400000"));
});
});