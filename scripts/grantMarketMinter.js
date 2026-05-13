const { ethers } = require("hardhat");

async function main() {
  const OUTCOME_TOKEN = "0x267F0B72F9E3a1e75fE9f105F5F952a9394726De";
  const MARKET = "0x56648Df09026D7f02788d129d8332d5242832852";

  const outcomeToken = await ethers.getContractAt("OutcomeToken", OUTCOME_TOKEN);

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  console.log("Granting MINTER_ROLE to market...");
  const tx = await outcomeToken.grantRole(MINTER_ROLE, MARKET);
  await tx.wait();

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});