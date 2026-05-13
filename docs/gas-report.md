# Gas Optimization Report

## Compiler Configuration

| Setting | Value |
|---|---|
| Solidity Version | 0.8.24 |
| Optimizer | Enabled |
| Optimizer Runs | 200 |
| viaIR | false |

---

# Core Protocol Operations

| Operation | Average Gas |
|---|---:|
| createMarket | 1,447,068 |
| createMarketDeterministic | 1,474,513 |
| buyShares | 108,665 |
| sellShares | 66,211 |
| claimPayout | 53,105 |
| resolveMarket | 49,549 |
| castVote | 83,285 |
| propose | 76,632 |
| delegate | 87,233 |

---

# Token Operations

| Operation | Average Gas |
|---|---:|
| approve | 46,378 |
| mint ERC20 | 51,331 |
| mint ERC1155 | 53,492 |
| burn ERC1155 | 28,387 |

---

# Deployment Costs

| Contract | Deployment Gas |
|---|---:|
| MarketFactory | 2,333,897 |
| PredictionMarket | 1,505,356 |
| GovernanceToken | 1,969,141 |
| PredictionGovernor | 3,947,858 |
| PredictionTimelock | 1,587,842 |
| OutcomeToken | 1,360,065 |
| FeeVault | 1,358,702 |
| ChainlinkResolver | 672,698 |

---

# Optimization Techniques Used

## 1. Yul Assembly

`MathUtils.sol` uses inline Yul assembly for optimized multiplication operations.

Result:
- lower execution overhead
- reduced stack operations
- improved arithmetic efficiency

---

## 2. CREATE2 Deterministic Deployment

`MarketFactory.sol` supports CREATE2 deployment for deterministic market addresses.

Benefits:
- predictable addresses
- easier frontend indexing
- reduced off-chain coordination

---

## 3. Packed Storage Layout

State variables are grouped to reduce storage slot usage where possible.

Benefits:
- fewer SSTORE operations
- reduced deployment and runtime gas

---

## 4. Custom Errors

Contracts use Solidity custom errors instead of revert strings.

Benefits:
- significantly cheaper revert costs
- smaller bytecode size

---

## 5. OpenZeppelin Optimized Primitives

The protocol relies on battle-tested optimized implementations:
- ERC20Votes
- ERC4626
- Governor
- TimelockController
- ERC1155

---

# L2 Cost Efficiency

Although gas units remain similar between Ethereum L1 and Base L2, transaction execution cost in ETH is substantially lower on Base due to reduced gas price.

The protocol was intentionally deployed on Base Sepolia to:
- reduce governance costs
- reduce AMM trading fees
- enable cheaper market creation
- improve UX for retail users

---

# Conclusion

The protocol achieves:
- 100k gas-level AMM trades
- sub-50k resolution execution
- optimized governance operations
- deterministic deployment support
- Yul-assisted arithmetic optimization

Gas benchmarks demonstrate that the protocol is suitable for deployment on low-cost L2 infrastructure such as Base.

## Real Base Sepolia Transactions

| Operation | Tx Hash | Base L2 Fee |
|---|---|---:|
| createMarket | `0xe105133a958f9627663f61311527e8bdecc82515f002952f23e1e38ac7bdd98e` | 0.00001121 ETH |
| createMarket | `0x82318a870e23cd95dcf7f27ce4a0ded6e09e1dc66b2f65061a12f99fcb25a0de` | 0.00002366 ETH |
| createMarket | `0x0f3fd5419febaa53a9f18364ba2ed9b1ef263f7350739019b12d0d70dcbfe091` | 0.00000887 ETH |
| createMarket | `0xf3254ad4e8d20a34754beb5c4067e7d7e383107a94f9369f7a83b0b40679e4c4` | 0.00000897 ETH |

These Base Sepolia transactions demonstrate the practical benefit of L2 deployment. Even large market creation operations execute for fractions of a cent compared to significantly higher Ethereum mainnet costs.