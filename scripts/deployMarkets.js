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

  console.log("Approving factory for all markets...");
  await (await collateral.approve(FACTORY, ethers.parseEther("8000"))).wait();

  console.log("Granting minter role...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await outcomeToken.grantRole(MINTER_ROLE, FACTORY)).wait();

  const markets = [
    {
      question: "Will LeBron James retire before the next NBA season?",
      endTime: Math.floor(new Date("2025-09-30").getTime() / 1000),
    },
    {
      question: "Will MrBeast get married before December 31, 2025?",
      endTime: Math.floor(new Date("2025-12-31").getTime() / 1000),
    },
    {
      question: "Will Bitcoin reach $150,000 before the end of 2025?",
      endTime: Math.floor(new Date("2025-12-31").getTime() / 1000),
    },
    {
      question: "Will the US Federal Reserve cut rates 3+ times in 2025?",
      endTime: Math.floor(new Date("2025-12-31").getTime() / 1000),
    },
  ];

  const deployedAddresses = [];

  for (const market of markets) {
    console.log(`\nCreating market: "${market.question}"`);
    const tx = await factory.createMarket(
      market.question,
      market.endTime,
      ethers.parseEther("1000"),
      ethers.parseEther("1000")
    );
    await tx.wait();

    const count = await factory.getMarketsCount();
    const marketAddress = await factory.markets(Number(count) - 1);
    deployedAddresses.push({ question: market.question, address: marketAddress });
    console.log(`  ✓ Deployed at: ${marketAddress}`);
  }

  console.log("\n========== DONE ==========");
  console.log("Paste these into STATIC_MARKETS in page.tsx:\n");
  for (const m of deployedAddresses) {
    console.log(`address: "${m.address}", // ${m.question}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});