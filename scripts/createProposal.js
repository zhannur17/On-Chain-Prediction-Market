const { ethers } = require("hardhat");

async function main() {
  const GOVERNOR = "0x7F0Ea970C3EC45DA7A6473911da83294123F92B2";
  const COLLATERAL = "0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7";

  const governor = await ethers.getContractAt("PredictionGovernor", GOVERNOR);

  const targets = [COLLATERAL];
  const values = [0];
  const calldatas = ["0x"];
  const description = "Proposal #1: Demo governance proposal";

  const tx = await governor.propose(
    targets,
    values,
    calldatas,
    description
  );

  const receipt = await tx.wait();

  console.log("Proposal created");
  console.log("Tx:", receipt.hash);

  const proposalId = await governor.hashProposal(
    targets,
    values,
    calldatas,
    ethers.id(description)
  );

  console.log("Proposal ID:", proposalId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});