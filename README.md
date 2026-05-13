# On-Chain Prediction Market

A full-stack decentralized prediction market protocol built on Base Sepolia. Users can create binary YES/NO markets, trade outcome shares via a constant-product AMM, earn fees through an ERC-4626 vault, and govern the protocol via a DAO.

## Architecture Overview

```
GovernanceToken (ERC20Votes + ERC20Permit)
       │
PredictionGovernor ──► PredictionTimelock (2-day delay)
                                │
                         MarketFactory (CREATE + CREATE2)
                                │
                      PredictionMarket (CPMM AMM)
                         │            │
                   OutcomeToken    FeeVault (ERC-4626)
                  (ERC-1155)
                                │
                        ChainlinkResolver (oracle)
```

## Deployed Contracts — Base Sepolia

| Contract | Address | Basescan |
|---|---|---|
| MockCollateral | `0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7` | [View](https://sepolia.basescan.org/address/0xE3F6E8b5Ff5bB4d5d10f0dc42649E3cF6eaEBEC7) |
| OutcomeToken | `0x267F0B72F9E3a1e75fE9f105F5F952a9394726De` | [View](https://sepolia.basescan.org/address/0x267F0B72F9E3a1e75fE9f105F5F952a9394726De) |
| MarketFactory | `0xf54dcBf5Cc6fDE628a55C07210735D0220154157` | [View](https://sepolia.basescan.org/address/0xf54dcBf5Cc6fDE628a55C07210735D0220154157) |
| GovernanceToken | `0x70f0bF28947F001ffFdba170EF452E5b1b59cBc1` | [View](https://sepolia.basescan.org/address/0x70f0bF28947F001ffFdba170EF452E5b1b59cBc1) |
| PredictionTimelock | `0xA22DEBDaa512c1cA9b21f375AB79238bFD58d831` | [View](https://sepolia.basescan.org/address/0xA22DEBDaa512c1cA9b21f375AB79238bFD58d831) |
| PredictionGovernor | `0x7F0Ea970C3EC45DA7A6473911da83294123F92B2` | [View](https://sepolia.basescan.org/address/0x7F0Ea970C3EC45DA7A6473911da83294123F92B2) |

## The Graph Subgraph

- **Endpoint:** `https://api.studio.thegraph.com/query/1749920/prediction-market/v0.0.1`
- **Studio:** https://thegraph.com/studio/subgraph/prediction-market

### GraphQL Queries

**1. Get all markets:**
```graphql
{
  markets(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    marketAddress
    question
    endTime
    createdAt
  }
}
```

**2. Get single market:**
```graphql
{
  market(id: "0xaaeD44e8c362A490a2866e473EF16Ea20135a6f6") {
    id
    marketAddress
    question
    endTime
    createdAt
  }
}
```

**3. Get trades for a market:**
```graphql
{
  trades(where: { market: "0xaaeD44e8c362A490a2866e473EF16Ea20135a6f6" }) {
    trader
    outcome
    amountIn
    amountOut
    fee
    blockTimestamp
  }
}
```

**4. Get factory stats:**
```graphql
{
  factory(id: "FACTORY") {
    marketsCount
  }
}
```

**5. Get market resolutions:**
```graphql
{
  resolutions(orderBy: blockTimestamp, orderDirection: desc) {
    market { question }
    winningOutcome
    blockTimestamp
  }
}
```

## Gas Comparison — L1 vs Base Sepolia (L2)

| Operation | L1 Mainnet (gas) | Base Sepolia (gas) | Savings |
|---|---|---|---|
| Deploy MarketFactory | ~1,200,000 | ~1,200,000 | ~10x cheaper in ETH |
| createMarket | ~450,000 | ~450,000 | ~10x cheaper in ETH |
| buyShares | ~95,000 | ~95,000 | ~10x cheaper in ETH |
| sellShares | ~85,000 | ~85,000 | ~10x cheaper in ETH |
| castVote | ~80,000 | ~80,000 | ~10x cheaper in ETH |
| approve + transfer | ~50,000 | ~50,000 | ~10x cheaper in ETH |

> Gas units are similar on L1 and L2 but ETH cost is ~10x lower on Base due to lower gas price.

## Project Structure

```
.
├── contracts/
│   ├── core/
│   │   ├── PredictionMarket.sol     # CPMM AMM, binary outcome market
│   │   ├── MarketFactory.sol        # CREATE + CREATE2 factory
│   │   └── MathUtils.sol            # Yul assembly math helpers
│   ├── governance/
│   │   ├── GovernanceToken.sol      # ERC20Votes + ERC20Permit
│   │   ├── PredictionGovernor.sol   # OZ Governor
│   │   └── PredictionTimelock.sol   # 2-day timelock
│   ├── tokens/
│   │   ├── OutcomeToken.sol         # ERC-1155 YES/NO shares
│   │   └── FeeVault.sol             # ERC-4626 fee vault
│   ├── oracle/
│   │   └── ChainlinkResolver.sol    # Chainlink + staleness check
│   ├── mocks/
│   │   ├── MockCollateral.sol
│   │   └── MockAggregator.sol
│   └── upgradeable/
│       ├── UpgradeableCounterV1.sol # UUPS proxy V1
│       └── UpgradeableCounterV2.sol # UUPS proxy V2
├── test/
│   ├── unit/                        # 50+ unit tests
│   ├── fuzz/                        # 10+ fuzz tests
│   ├── invariant/                   # 5+ invariant tests
│   └── fork/                        # 3+ fork tests
├── scripts/
│   ├── deploy.js                    # Main deployment script
│   ├── createMarket.js
│   ├── createProposal.js
│   ├── mintTokens.js
│   └── mintGovTokens.js
├── subgraph/                        # The Graph indexing
├── frontend/                        # Next.js + wagmi + viem
└── .github/workflows/ci.yml        # CI pipeline
```

## Design Patterns Used

| Pattern | Where |
|---|---|
| Factory (CREATE + CREATE2) | `MarketFactory.sol` |
| Proxy / UUPS | `UpgradeableCounterV1/V2.sol` |
| Checks-Effects-Interactions | `PredictionMarket.sol`, `FeeVault.sol` |
| Access Control / Role-based | All contracts via OpenZeppelin AccessControl |
| State Machine | `PredictionMarket.sol` (Open → Resolved → Cancelled) |
| Oracle adapter | `ChainlinkResolver.sol` |
| Timelock | `PredictionTimelock.sol` (2-day delay) |
| Reentrancy Guard | `PredictionMarket.sol` |
| Pull-over-push payments | `FeeVault.sol` (claimPayout) |

## Prerequisites

- Node.js 22+
- npm

## Setup

```bash
# Clone the repo
git clone https://github.com/zhannur17/On-Chain-Prediction-Market.git
cd On-Chain-Prediction-Market

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Environment Variables

Create `.env` in the root:
```
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1749920/prediction-market/v0.0.1
```

## Running Tests

```bash
# Run all tests
npx hardhat test

# Run with gas report
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

## Deploy

```bash
# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# Create a market
npx hardhat run scripts/createMarket.js --network baseSepolia

# Mint governance tokens
npx hardhat run scripts/mintGovTokens.js --network baseSepolia

# Create a governance proposal
npx hardhat run scripts/createProposal.js --network baseSepolia
```

## Running the Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

## CI/CD

GitHub Actions runs on every push and pull request:
- Compile contracts
- Run full test suite
- Run coverage
- Build frontend
- Run Slither static analysis

## Team

| Member | Area of Ownership |
|---|---|
| Zhanuka | Smart contracts, deployment, frontend |
| Ayazhan | Frontend, tests, contracts |