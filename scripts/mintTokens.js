const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting to:", deployer.address);

  const collateral = await ethers.getContractAt(
    "MockCollateral",
    "0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7"
  );

  const tx = await collateral.mint(
    deployer.address,
    ethers.parseEther("10000")
  );
  await tx.wait();

  const balance = await collateral.balanceOf(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "mUSDC");
}

main().catch(console.error);