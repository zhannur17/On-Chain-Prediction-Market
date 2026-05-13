const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const COLLATERAL = "0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7";
  const OUTCOME_TOKEN = "0x267F0B72F9E3a1e75fE9f105F5F952a9394726De";
  const FACTORY = "0xf54dcBf5Cc6fDE628a55C07210735D0220154157";

  const collateral = await ethers.getContractAt("MockCollateral", COLLATERAL);
  const outcomeToken = await ethers.getContractAt("OutcomeToken", OUTCOME_TOKEN);
  const factory = await ethers.getContractAt("MarketFactory", FACTORY);

  console.log("Minting collateral...");
  await (await collateral.mint(deployer.address, ethers.parseEther("10000"))).wait();

  console.log("Approving factory...");
  await (await collateral.approve(FACTORY, ethers.parseEther("2000"))).wait();

  console.log("Granting minter role...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await outcomeToken.grantRole(MINTER_ROLE, FACTORY)).wait();

  console.log("Creating market...");
  const endTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await (
    await factory.createMarket(
      "Will ETH be above $3000 by end of 2025?",
      endTime,
      ethers.parseEther("1000"),
      ethers.parseEther("1000")
    )
  ).wait();

  const count = await factory.getMarketsCount();
  console.log("Market created. Total markets:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});