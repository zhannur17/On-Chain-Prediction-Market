const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const GOV_TOKEN = "0x70f0bF28947F001ffFdba170EF452E5b1b59cBc1";

  const govToken = await ethers.getContractAt("GovernanceToken", GOV_TOKEN);

  console.log("Minting governance tokens...");
  const tx1 = await govToken.mint(deployer.address, ethers.parseEther("1000"));
  await tx1.wait();

  console.log("Delegating to self...");
  const tx2 = await govToken.delegate(deployer.address);
  await tx2.wait();

  const balance = await govToken.balanceOf(deployer.address);
  const votes = await govToken.getVotes(deployer.address);
  console.log("Balance:", ethers.formatEther(balance));
  console.log("Votes:", ethers.formatEther(votes));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
