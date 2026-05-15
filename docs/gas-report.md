# Gas Optimization Report
## On-Chain Prediction Market Protocol
**Version:** 1.0.0 | **Network:** Base Sepolia | **Toolchain:** Hardhat + hardhat-gas-reporter
**Solidity:** 0.8.24 | **Optimizer:** enabled | **Runs:** 200 | **viaIR:** false

---

## 1. Methodology

Gas measurements were obtained by running the full test suite with `REPORT_GAS=true`:

```bash
$env:REPORT_GAS="true"; npx hardhat test
```

All 84 tests pass. Gas costs are measured in the Hardhat local environment with block gas limit of 60,000,000.

L1 vs L2 cost comparison uses:
- **L1 Ethereum Mainnet:** ~15 gwei gas price (conservative estimate)
- **Base Sepolia L2:** ~0.001 gwei gas price (~15,000x cheaper)

---

## 2. Method Gas Costs

### 2.1 PredictionMarket — Core AMM Operations

| Method | Min Gas | Max Gas | Avg Gas | Notes |
|---|---|---|---|---|
| `buyShares` | 108,612 | 108,688 | **108,665** | Main trading function |
| `sellShares` | 66,179 | 66,243 | **66,211** | Sell outcome shares |
| `resolveMarket` | — | — | **49,549** | Resolver only |
| `claimPayout` | — | — | **53,105** | Winner claim |

### 2.2 MarketFactory — Deployment Operations

| Method | Min Gas | Max Gas | Avg Gas | Notes |
|---|---|---|---|---|
| `createMarket` (CREATE) | 1,433,261 | 1,450,581 | **1,447,068** | Standard deployment |
| `createMarketDeterministic` (CREATE2) | — | — | **1,474,513** | +27,445 gas vs CREATE |

CREATE2 costs ~1.9% more than CREATE due to salt hashing overhead. The predictable address benefit justifies this cost.

### 2.3 Governance Operations

| Method | Contract | Avg Gas | Notes |
|---|---|---|---|
| `propose` | PredictionGovernor | **76,632** | Submit proposal |
| `castVote` | PredictionGovernor | **83,285** | Vote on proposal |
| `delegate` | GovernanceToken | **87,233** | Delegate voting power |
| `mint` | GovernanceToken | **89,530** | Mint PRED tokens |
| `transfer` | GovernanceToken | **56,340** | Transfer PRED |

### 2.4 Oracle Operations

| Method | Contract | Avg Gas | Notes |
|---|---|---|---|
| `registerFeed` | ChainlinkResolver | **71,033** | Admin only |
| `resolveMarket` | ChainlinkResolver | **105,133** | Reads Chainlink feed |

### 2.5 FeeVault (ERC-4626) Operations

| Method | Avg Gas | Notes |
|---|---|---|
| `deposit` | **106,582** | LP deposit |
| `depositFees` | **81,390** | Fee depositor only |
| `grantRole` | **51,514** | AccessControl |

### 2.6 Token Operations

| Method | Contract | Avg Gas | Notes |
|---|---|---|---|
| `approve` | MockCollateral | **46,378** | ERC-20 approve |
| `mint` | MockCollateral | **51,331** | ERC-20 mint |
| `mint` | OutcomeToken | **53,492** | ERC-1155 mint |
| `burn` | OutcomeToken | **28,387** | ERC-1155 burn |
| `grantRole` | OutcomeToken | **51,513** | AccessControl |

### 2.7 UUPS Upgrade Operations

| Method | Contract | Avg Gas | Notes |
|---|---|---|---|
| `increment` | UpgradeableCounterV1 | **48,359** | V1 write |
| `upgradeToAndCall` | UpgradeableCounterV2 | **37,613** | Upgrade proxy |
| `decrement` | UpgradeableCounterV2 | **26,538** | V2-only function |

---

## 3. Deployment Gas Costs

| Contract | Gas Used | % of Block Limit | Notes |
|---|---|---|---|
| PredictionGovernor | 3,947,858 | 6.6% | Largest contract |
| MarketFactory | 2,333,897 | 3.9% | Deploys markets |
| PredictionTimelock | 1,587,842 | 2.6% | TimelockController |
| PredictionMarket | 1,505,356 | 2.5% | Per market instance |
| FeeVault | 1,358,702 | 2.3% | ERC-4626 vault |
| OutcomeToken | 1,360,065 | 2.3% | ERC-1155 |
| GovernanceToken | 1,969,141 | 3.3% | ERC20Votes |
| UpgradeableCounterV2 | 644,214 | 1.1% | UUPS V2 |
| UpgradeableCounterV1 | 603,532 | 1.0% | UUPS V1 |
| ChainlinkResolver | 672,698 | 1.1% | Oracle adapter |
| MockCollateral | 566,090 | 0.9% | Test only |
| MockAggregator | 194,497 | 0.3% | Test only |
| MathUtils | 103,843 | 0.2% | Benchmark only |

All contracts are well within the block gas limit. The most expensive single contract (PredictionGovernor at 6.6%) leaves ample headroom.

---

## 4. L1 vs L2 Gas Comparison

The following table compares estimated ETH cost for 6 key operations on Ethereum Mainnet (L1) vs Base Sepolia (L2).

**Assumptions:**
- L1 gas price: 15 gwei
- L2 gas price: 0.001 gwei
- ETH price: $3,000 USD

| Operation | Gas Units | L1 Cost (ETH) | L1 Cost (USD) | L2 Cost (ETH) | L2 Cost (USD) | Savings |
|---|---|---|---|---|---|---|
| `buyShares` | 108,665 | 0.001630 ETH | $4.89 | 0.000000109 ETH | $0.000326 | ~15,000x |
| `sellShares` | 66,211 | 0.000993 ETH | $2.98 | 0.000000066 ETH | $0.000199 | ~15,000x |
| `createMarket` | 1,447,068 | 0.021706 ETH | $65.12 | 0.00000145 ETH | $0.00434 | ~15,000x |
| `castVote` | 83,285 | 0.001249 ETH | $3.75 | 0.0000000833 ETH | $0.000250 | ~15,000x |
| `resolveMarket` | 49,549 | 0.000743 ETH | $2.23 | 0.0000000495 ETH | $0.000149 | ~15,000x |
| `claimPayout` | 53,105 | 0.000797 ETH | $2.39 | 0.0000000531 ETH | $0.000159 | ~15,000x |

**Conclusion:** Base Sepolia (L2) provides approximately **15,000x cost reduction** for all operations compared to Ethereum Mainnet, making the prediction market protocol economically viable for retail users. A `buyShares` transaction that would cost ~$5 on L1 costs less than $0.001 on Base.

---

## 5. Yul Assembly Benchmark

`MathUtils.sol` benchmarks pure Solidity vs inline Yul assembly multiplication:

| Method | Gas (from test output) | Notes |
|---|---|---|
| `multiplySolidity(x, y)` | ~22,000 | Solidity 0.8.24 with optimizer |
| `multiplyYul(x, y)` | ~21,500 | Inline Yul assembly |

**Result:** Yul assembly saves approximately **500 gas (~2.3%)** for a simple multiplication. With optimizer runs=200, the Solidity compiler already generates near-optimal code, leaving minimal room for manual Yul optimization. For complex operations (e.g., multi-step AMM calculations), Yul savings would be more significant.

---

## 6. Gas Optimization Techniques Applied

| Technique | Location | Impact |
|---|---|---|
| `immutable` for collateralToken, outcomeToken | PredictionMarket, MarketFactory | Saves ~2,100 gas per read vs storage |
| `custom errors` instead of require strings | All contracts | Saves ~50 gas per revert + smaller bytecode |
| `SafeERC20` avoids redundant checks | PredictionMarket, FeeVault | No gas overhead, safety benefit |
| Solidity optimizer runs=200 | hardhat.config.js | Balances deploy vs runtime gas |
| `unchecked` blocks | Not used | Solidity 0.8.24 overflow checks are cheap |
| Packing state variables | PredictionMarket (state+winningOutcome in same slot) | Saves 1 storage slot |

---

## 7. Test Summary

```
84 passing (5s)
0 failing
```

All gas measurements are from the passing test suite. No tests were skipped or mocked to reduce gas consumption.
