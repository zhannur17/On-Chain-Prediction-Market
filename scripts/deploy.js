const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const MockCollateral = await ethers.getContractFactory("MockCollateral");
  const collateral = await MockCollateral.deploy();
  await collateral.waitForDeployment();
  console.log("MockCollateral:", await collateral.getAddress());

  const OutcomeToken = await ethers.getContractFactory("OutcomeToken");
  const outcomeToken = await OutcomeToken.deploy(deployer.address);
  await outcomeToken.waitForDeployment();
  console.log("OutcomeToken:", await outcomeToken.getAddress());

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    await collateral.getAddress(),
    await outcomeToken.getAddress(),
    deployer.address
  );
  await factory.waitForDeployment();
  console.log("MarketFactory:", await factory.getAddress());

  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(deployer.address);
  await governanceToken.waitForDeployment();
  console.log("GovernanceToken:", await governanceToken.getAddress());

  const PredictionTimelock = await ethers.getContractFactory("PredictionTimelock");
  const timelock = await PredictionTimelock.deploy(
    [],
    [],
    deployer.address
  );
  await timelock.waitForDeployment();
  console.log("PredictionTimelock:", await timelock.getAddress());

  const PredictionGovernor = await ethers.getContractFactory("PredictionGovernor");
  const governor = await PredictionGovernor.deploy(
    await governanceToken.getAddress(),
    await timelock.getAddress()
  );
  await governor.waitForDeployment();
  console.log("PredictionGovernor:", await governor.getAddress());

  console.log("Deployment completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});