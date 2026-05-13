const { ethers } = require("hardhat");

async function main() {
  const CONTRACTS = {
    MockCollateral: "0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7",
    OutcomeToken: "0x267F0B72F9E3a1e75fE9f105F5F952a9394726De",
    MarketFactory: "0xf54dcBf5Cc6fDE628a55C07210735D0220154157",
    GovernanceToken: "0x70f0bF28947F001ffFdba170EF452E5b1b59cBc1",
    PredictionTimelock: "0xA22DEBDaa512c1cA9b21f375AB79238bFD58d831",
    PredictionGovernor: "0x7F0Ea970C3EC45DA7A6473911da83294123F92B2",
  };

  console.log("Post-deployment verification started...\n");

  const collateral = await ethers.getContractAt("MockCollateral", CONTRACTS.MockCollateral);
  const outcomeToken = await ethers.getContractAt("OutcomeToken", CONTRACTS.OutcomeToken);
  const factory = await ethers.getContractAt("MarketFactory", CONTRACTS.MarketFactory);
  const govToken = await ethers.getContractAt("GovernanceToken", CONTRACTS.GovernanceToken);
  const timelock = await ethers.getContractAt("PredictionTimelock", CONTRACTS.PredictionTimelock);
  const governor = await ethers.getContractAt("PredictionGovernor", CONTRACTS.PredictionGovernor);

  console.log("MockCollateral name:", await collateral.name());
  console.log("MockCollateral symbol:", await collateral.symbol());

  console.log("OutcomeToken YES id:", (await outcomeToken.YES()).toString());
  console.log("OutcomeToken NO id:", (await outcomeToken.NO()).toString());

  console.log("Market count:", (await factory.getMarketsCount()).toString());

  console.log("GovernanceToken name:", await govToken.name());
  console.log("GovernanceToken symbol:", await govToken.symbol());

  console.log("Governor voting delay:", (await governor.votingDelay()).toString());
  console.log("Governor voting period:", (await governor.votingPeriod()).toString());
  console.log("Governor proposal threshold:", (await governor.proposalThreshold()).toString());

  console.log("Timelock min delay:", (await timelock.getMinDelay()).toString());

  console.log("\nPost-deployment verification completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});