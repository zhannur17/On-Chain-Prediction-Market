const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance lifecycle", function () {
  let owner;
  let token, timelock, governor;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    token = await GovernanceToken.deploy(owner.address);

    await token.delegate(owner.address);

    const PredictionTimelock = await ethers.getContractFactory("PredictionTimelock");
    timelock = await PredictionTimelock.deploy([], [], owner.address);

    const PredictionGovernor = await ethers.getContractFactory("PredictionGovernor");
    governor = await PredictionGovernor.deploy(
      await token.getAddress(),
      await timelock.getAddress()
    );
  });

  it("creates a governance proposal", async function () {
    const targets = [await token.getAddress()];
    const values = [0];
    const calldatas = [
      token.interface.encodeFunctionData("transfer", [
        owner.address,
        ethers.parseEther("1"),
      ]),
    ];
    const description = "Transfer 1 token to owner";

    await expect(
      governor.propose(targets, values, calldatas, description)
    ).to.emit(governor, "ProposalCreated");
  });

  it("allows voting on a proposal after voting delay", async function () {
    const targets = [await token.getAddress()];
    const values = [0];
    const calldatas = [
      token.interface.encodeFunctionData("transfer", [
        owner.address,
        ethers.parseEther("1"),
      ]),
    ];
    const description = "Transfer 1 token to owner";

    await governor.propose(targets, values, calldatas, description);

    const proposalId = await governor.hashProposal(
      targets,
      values,
      calldatas,
      ethers.id(description)
    );

    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_mine");

    for (let i = 0; i < 7200; i++) {
      await ethers.provider.send("evm_mine");
    }

    await expect(
      governor.castVote(proposalId, 1)
    ).to.emit(governor, "VoteCast");
  });

  it("returns correct proposal state", async function () {
  const targets = [await token.getAddress()];
  const values = [0];
  const calldatas = [
    token.interface.encodeFunctionData("transfer", [
      owner.address,
      ethers.parseEther("1"),
    ]),
  ];
  const description = "State test proposal";

  await governor.propose(targets, values, calldatas, description);

  const proposalId = await governor.hashProposal(
    targets,
    values,
    calldatas,
    ethers.id(description)
  );

  const state = await governor.state(proposalId);

  expect(state).to.equal(0);
});

it("returns quorum value", async function () {
  await token.delegate(owner.address);

  await ethers.provider.send("evm_mine");

  const currentBlock = await ethers.provider.getBlockNumber();
  const quorum = await governor.quorum(currentBlock - 1);

  expect(quorum).to.be.gt(0);
});
});