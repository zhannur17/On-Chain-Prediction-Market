const { ethers } = require("hardhat");

async function main() {
  const outcomeToken = await ethers.getContractAt(
    "OutcomeToken",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );

  const MINTER_ROLE = await outcomeToken.MINTER_ROLE();

  const tx = await outcomeToken.grantRole(
    MINTER_ROLE,
    "0x75537828f2ce51be7289709686A69CbFDbB714F1"
  );

  await tx.wait();

  console.log("MINTER_ROLE granted");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});