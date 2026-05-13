# On-Chain Prediction Market — Architecture Document

# 1. Introduction

## 1.1 Project Overview

The On-Chain Prediction Market is a decentralized application deployed on Base Sepolia that enables users to create, trade, and resolve binary prediction markets fully on-chain. Users can speculate on real-world events using a Constant Product Market Maker (CPMM) automated market maker model similar to decentralized exchanges.

Each market contains two outcomes:

* YES
* NO

Users trade shares representing probabilities of future events. The protocol dynamically adjusts pricing based on reserve balances and market demand.

The system integrates:

* on-chain AMM trading
* governance mechanisms
* oracle-based resolution
* ERC-1155 outcome shares
* ERC-4626 fee vaults
* subgraph indexing through The Graph
* upgradeability testing
* L2 deployment optimization

The protocol was intentionally deployed on Base Sepolia to minimize gas costs and improve user accessibility.

---

## 1.2 Goals

The primary goals of the project are:

* Build a fully decentralized prediction market protocol
* Demonstrate advanced Solidity engineering patterns
* Implement governance using OpenZeppelin Governor
* Integrate Chainlink-style oracle resolution
* Support deterministic CREATE2 deployments
* Index protocol activity through The Graph
* Provide a modern React/Next.js frontend
* Achieve high test coverage with fuzz and invariant testing
* Optimize execution costs for L2 deployment

---

## 1.3 Technology Stack

* Solidity
* Hardhat
* OpenZeppelin
* Base Sepolia
* The Graph
* Next.js
* wagmi
* viem
* ethers.js

---

# 2. High-Level Architecture

## 2.1 System Overview

The protocol consists of several interconnected layers:

1. Smart contract layer
2. Governance layer
3. Oracle resolution layer
4. Indexing layer
5. Frontend application layer

Users interact with the Next.js frontend through MetaMask or WalletConnect-compatible wallets. The frontend communicates with smart contracts deployed on Base Sepolia using wagmi, viem, and ethers.js.

The Graph indexes protocol events and exposes them through GraphQL APIs used by the frontend for efficient querying.

Governance proposals are executed through OpenZeppelin Governor and TimelockController contracts.

---

## 2.2 Component Diagram

Core protocol components include:

* MarketFactory
* PredictionMarket
* OutcomeToken
* GovernanceToken
* PredictionGovernor
* PredictionTimelock
* ChainlinkResolver
* FeeVault
* Subgraph Indexer
* Next.js Frontend

The MarketFactory deploys PredictionMarket contracts. PredictionMarket contracts mint ERC-1155 outcome shares through OutcomeToken. Governance contracts manage protocol upgrades and parameter changes. ChainlinkResolver resolves market outcomes using oracle data.

---

## 2.3 Contract Relationships

The architecture follows a modular contract design.

* MarketFactory deploys PredictionMarket contracts
* PredictionMarket interacts with OutcomeToken
* GovernanceToken supplies voting power to PredictionGovernor
* PredictionGovernor controls PredictionTimelock
* FeeVault collects protocol fees
* ChainlinkResolver resolves oracle-driven markets
* The Graph indexes protocol events

This modular architecture improves maintainability, extensibility, and security isolation.

---

# 3. Smart Contract Architecture

## 3.1 MarketFactory

### Responsibilities

MarketFactory is responsible for:

* deploying new prediction markets
* storing deployed market addresses
* enforcing creator permissions
* deterministic deployment support
* market registry management

The contract acts as the protocol entry point for market creation.

---

### CREATE vs CREATE2

The protocol supports both CREATE and CREATE2 deployment flows.

CREATE2 enables deterministic address generation. This provides several advantages:

* predictable market addresses
* easier frontend indexing
* improved off-chain coordination
* replayable deployment logic

CREATE deployments are also supported for simpler deployment flows.

---

### Access Control

Only authorized creators can deploy markets. Administrative actions are protected using ownership-based access control inherited from OpenZeppelin primitives.

Critical permissions include:

* market creation
* role assignment
* governance configuration

---

## 3.2 PredictionMarket

### CPMM AMM Model

PredictionMarket uses a Constant Product Market Maker model:

x * y = k

Where:

* x = YES reserve
* y = NO reserve
* k = invariant constant

Prices dynamically adjust based on reserve imbalances.

---

### YES/NO Share Trading

Users purchase YES or NO shares by depositing collateral tokens.

The protocol:

* transfers collateral
* calculates output shares
* updates reserves
* mints ERC-1155 shares

Users may later sell shares back into the AMM.

---

### Pricing Logic

Prices are derived from reserve ratios.

YES price:

YES = NO reserve / total reserves

NO price:

NO = YES reserve / total reserves

This allows probability-style pricing representation.

---

### Resolution Lifecycle

Markets remain open until:

* expiration timestamp reached
* oracle resolution finalized

After resolution:

* winning side determined
* losing shares become worthless
* payouts unlocked

---

### Claim Flow

Winning token holders may redeem shares for collateral.

The claim process:

1. verifies winning outcome
2. burns outcome shares
3. transfers collateral payout

The protocol prevents double claims through token burn mechanics.

---

## 3.3 OutcomeToken

### ERC-1155 Design

OutcomeToken implements ERC-1155 because:

* YES/NO shares are fungible
* multiple markets coexist
* gas efficiency improves versus ERC-721

Each market maintains:

* YES token id
* NO token id

---

### Mint/Burn Flow

PredictionMarket contracts mint shares during trading and burn shares during redemption.

Minting is restricted through MINTER_ROLE access control.

---

## 3.4 Governance System

### GovernanceToken

GovernanceToken uses OpenZeppelin ERC20Votes.

Features include:

* delegation
* snapshot voting
* quorum tracking
* capped supply

Voting power derives from delegated balances.

---

### PredictionGovernor

PredictionGovernor controls:

* proposal creation
* voting
* quorum enforcement
* execution scheduling

Proposal states include:

* Pending
* Active
* Defeated
* Succeeded
* Queued
* Executed

---

### PredictionTimelock

PredictionTimelock enforces delayed execution of successful proposals.

Benefits include:

* user exit window
* governance transparency
* attack mitigation

---

### Proposal Lifecycle

Proposal lifecycle:

1. proposal submitted
2. voting delay
3. active voting
4. quorum validation
5. queueing
6. timelock delay
7. execution

This follows OpenZeppelin governance standards.

---

## 3.5 FeeVault

### ERC-4626 Design

FeeVault implements ERC-4626 vault standards.

The vault:

* stores collected fees
* issues vault shares
* supports deposits and withdrawals

ERC-4626 improves composability with DeFi tooling.

---

### Fee Distribution

Protocol trading fees accumulate inside FeeVault.

Future governance proposals may define:

* treasury allocations
* staking rewards
* protocol buybacks

---

## 3.6 ChainlinkResolver

### Oracle Integration

ChainlinkResolver integrates Chainlink-style price feeds.

Oracle feeds determine:

* final market resolution
* strike price comparisons
* outcome validation

---

### Staleness Protection

The resolver validates oracle freshness using timestamps.

If oracle data becomes stale:

* resolution reverts
* invalid prices rejected

This prevents outdated oracle exploitation.

---

### Resolution Security

Only authorized resolvers may finalize markets.

The protocol prevents:

* duplicate resolution
* invalid oracle responses
* unauthorized execution

---

# 4. Frontend Architecture

## 4.1 Next.js Application

The frontend uses Next.js App Router architecture.

Features include:

* SSR-compatible rendering
* React client components
* wallet integration
* responsive design

---

## 4.2 Wallet Integration

Wallet integration uses:

* wagmi
* RainbowKit
* viem
* MetaMask

Supported features:

* wallet connection
* transaction signing
* network switching
* balance reading

---

## 4.3 State Management

Frontend state is managed through:

* React hooks
* wagmi query caching
* local component state

Subgraph queries reduce unnecessary RPC requests.

---

## 4.4 Error Handling

The frontend includes:

* transaction rejection handling
* insufficient balance handling
* wrong network detection
* readable user messages

Raw RPC errors are hidden from users.

---

## 4.5 Network Detection

The application verifies Base Sepolia chain ID before transaction execution.

Users are prompted to switch networks if connected to unsupported chains.

---

# 5. Subgraph Architecture

## 5.1 Indexed Entities

The Graph indexes:

* Market
* Trade
* Resolution
* Factory

These entities provide efficient frontend querying.

---

## 5.2 Event Indexing

Indexed events include:

* MarketCreated
* SharesBought
* MarketResolved

PredictionMarket templates dynamically index newly deployed markets.

---

## 5.3 GraphQL Queries

The frontend executes GraphQL queries to:

* fetch markets
* fetch trade history
* fetch resolutions
* retrieve factory statistics
* retrieve indexed activity

---

## 5.4 Frontend Integration

The frontend retrieves indexed data through GraphQL instead of direct RPC calls where possible.

Benefits:

* faster queries
* historical filtering
* reduced RPC load
* simplified pagination

---

# 6. Security Architecture

## 6.1 Access Control

The protocol uses:

* Ownable
* AccessControl
* role-based permissions

Administrative operations are restricted.

---

## 6.2 Reentrancy Protection

Critical functions use ReentrancyGuard protection.

Protected flows include:

* buyShares
* sellShares
* claimPayout

---

## 6.3 Oracle Validation

Oracle validation includes:

* stale timestamp checks
* invalid answer rejection
* duplicate resolution prevention

---

## 6.4 Governance Security

Governance security mechanisms include:

* voting delay
* quorum requirements
* proposal threshold
* timelock enforcement

---

## 6.5 Timelock Guarantees

Timelock guarantees provide:

* delayed execution
* governance transparency
* emergency reaction window

---

# 7. Testing Strategy

## 7.1 Unit Testing

The protocol contains 84 passing tests covering:

* trading
* governance
* vaults
* oracles
* access control
* deployment logic

---

## 7.2 Fuzz Testing

Fuzz testing validates:

* AMM reserve behavior
* random trade inputs
* pricing invariants

---

## 7.3 Invariant Testing

Invariant tests verify:

* reserve consistency
* CPMM invariant preservation
* market state safety

---

## 7.4 Upgradeability Testing

The protocol includes UUPS upgrade tests validating:

* storage preservation
* upgrade authorization
* implementation replacement

---

## 7.5 Coverage Metrics

Coverage metrics:

* Lines: 91.37%
* Statements: 87.1%
* Functions: 84.62%

---

# 8. Gas Optimization

## 8.1 Yul Assembly

MathUtils.sol uses inline Yul assembly for optimized arithmetic operations.

Benefits:

* reduced stack operations
* lower execution overhead

---

## 8.2 Packed Storage

State variables are grouped to reduce storage slot usage.

---

## 8.3 Custom Errors

Custom Solidity errors replace revert strings.

Benefits:

* smaller bytecode
* lower revert gas costs

---

## 8.4 L2 Deployment Benefits

Base Sepolia deployment significantly reduces execution cost compared to Ethereum L1.

Benefits:

* cheaper trading
* cheaper governance
* lower deployment cost

---

# 9. Deployment Architecture

## 9.1 Base Sepolia Deployment

Contracts are deployed on Base Sepolia testnet.

Deployment includes:

* MarketFactory
* PredictionMarket
* GovernanceToken
* PredictionGovernor
* PredictionTimelock
* FeeVault
* ChainlinkResolver

---

## 9.2 Verified Contracts

All major contracts are verified on BaseScan.

Verification improves:

* transparency
* auditability
* developer trust

---

## 9.3 CI/CD Pipeline

CI pipeline includes:

* linting
* compilation
* testing
* coverage generation
* gas benchmarking

---

# 10. Conclusion

The On-Chain Prediction Market demonstrates a full-stack decentralized protocol architecture integrating:

* AMM prediction trading
* governance systems
* oracle resolution
* ERC-1155 outcome shares
* ERC-4626 fee vaults
* The Graph indexing
* Base L2 deployment optimization

The project emphasizes:

* modularity
* security
* gas efficiency
* testing quality
* scalability

The final architecture provides a strong foundation for production-grade decentralized prediction markets on Ethereum-compatible L2 infrastructure.
