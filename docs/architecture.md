# Architecture & Design Document
## On-Chain Prediction Market Protocol
**Version:** 1.0.0 | **Network:** Base Sepolia | **Course:** Blockchain Technologies 2

---

## 1. System Context Diagram (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL ACTORS                              │
│                                                                     │
│   [Trader]          [LP Provider]       [DAO Voter]    [Resolver]   │
│   Buys/sells        Deposits into       Votes on       Resolves     │
│   outcome shares    FeeVault            proposals      markets      │
└────────┬──────────────────┬─────────────────┬──────────┬───────────┘
         │                  │                 │          │
         ▼                  ▼                 ▼          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ON-CHAIN PREDICTION MARKET PROTOCOL                    │
│                    (Base Sepolia L2)                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │PredictionMkt │  │  FeeVault    │  │  Governance Stack        │  │
│  │(CPMM AMM)    │  │  (ERC-4626)  │  │  Governor + Timelock     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │MarketFactory │  │OutcomeToken  │  │  ChainlinkResolver       │  │
│  │(CREATE/2)    │  │(ERC-1155)    │  │  (Oracle Adapter)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────┐              ┌────────────────────────────┐
│  EXTERNAL SERVICES  │              │   EXTERNAL SERVICES        │
│                     │              │                            │
│  Chainlink Price    │              │  The Graph                 │
│  Feeds (ETH/USD)    │              │  (Subgraph Indexer)        │
└─────────────────────┘              └────────────────────────────┘
```

**System boundaries:**
- All smart contracts deployed on Base Sepolia (L2)
- Frontend: Next.js 15 + wagmi + viem
- Indexing: The Graph Studio subgraph
- Oracle: Chainlink AggregatorV3Interface

---

## 2. Container & Component Diagram

### 2.1 Contract Relationships

```
                    ┌─────────────────────────────────────┐
                    │           GovernanceToken            │
                    │    ERC20 + ERC20Votes + ERC20Permit  │
                    │    MAX_SUPPLY = 100,000,000 PRED     │
                    │    Owner: deployer                   │
                    └──────────────┬──────────────────────┘
                                   │ IVotes
                    ┌──────────────▼──────────────────────┐
                    │         PredictionGovernor           │
                    │  voting delay:  7200 blocks (1 day)  │
                    │  voting period: 50400 blocks (1 wk)  │
                    │  quorum:        4%                   │
                    │  threshold:     1 PRED               │
                    └──────────────┬──────────────────────┘
                                   │ TimelockController
                    ┌──────────────▼──────────────────────┐
                    │         PredictionTimelock           │
                    │         MIN_DELAY = 2 days           │
                    │  Controls: treasury, privileged ops  │
                    └─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        MarketFactory                             │
│  AccessControl: DEFAULT_ADMIN_ROLE, MARKET_CREATOR_ROLE          │
│  createMarket()          → CREATE  (standard deployment)         │
│  createMarketDeterministic() → CREATE2 (predictable address)     │
│  predictMarketAddress()  → view (pre-compute CREATE2 address)    │
└─────────────────────┬────────────────────────────────────────────┘
                      │ deploys
          ┌───────────▼───────────────┐
          │      PredictionMarket     │◄─── IERC20 (collateralToken)
          │  State: Open→Resolved     │
          │  CPMM: x·y=k, fee 0.3%   │◄─── OutcomeToken (ERC-1155)
          │  Roles: RESOLVER_ROLE     │
          │  ReentrancyGuard          │
          └───────────┬───────────────┘
                      │ mints/burns
          ┌───────────▼───────────────┐    ┌──────────────────────┐
          │       OutcomeToken        │    │      FeeVault        │
          │  ERC-1155                 │    │  ERC-4626            │
          │  ID 0 = YES shares        │    │  asset: collateral   │
          │  ID 1 = NO shares         │    │  shares: vPRED       │
          │  Roles: MINTER_ROLE       │    │  FEE_DEPOSITOR_ROLE  │
          └───────────────────────────┘    └──────────────────────┘

          ┌─────────────────────────────────────────────────────┐
          │              ChainlinkResolver                      │
          │  STALENESS_THRESHOLD = 3600s                        │
          │  DISPUTE_WINDOW = 2 hours                           │
          │  Roles: RESOLVER_ROLE, DEFAULT_ADMIN_ROLE           │
          │  Integrates: AggregatorV3Interface (ETH/USD feed)   │
          └─────────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────────┐
          │    UpgradeableCounterV1 / V2 (UUPS Proxy)          │
          │  V1: increment()                                    │
          │  V2: increment() + decrement() + version()         │
          │  _authorizeUpgrade: onlyOwner                      │
          └─────────────────────────────────────────────────────┘
```

### 2.2 Access Control Roles

| Contract | Role | Holder | Permissions |
|---|---|---|---|
| MarketFactory | DEFAULT_ADMIN_ROLE | deployer | grant/revoke roles |
| MarketFactory | MARKET_CREATOR_ROLE | deployer | createMarket() |
| PredictionMarket | DEFAULT_ADMIN_ROLE | factory | grant/revoke roles |
| PredictionMarket | RESOLVER_ROLE | deployer/Chainlink | resolveMarket() |
| OutcomeToken | DEFAULT_ADMIN_ROLE | deployer | grant roles |
| OutcomeToken | MINTER_ROLE | PredictionMarket | mint/burn shares |
| FeeVault | DEFAULT_ADMIN_ROLE | deployer | grant roles |
| FeeVault | FEE_DEPOSITOR_ROLE | market contracts | depositFees() |
| ChainlinkResolver | DEFAULT_ADMIN_ROLE | deployer | registerFeed() |
| ChainlinkResolver | RESOLVER_ROLE | deployer | resolveMarket() |
| GovernanceToken | Ownable (owner) | deployer | mint() |
| UpgradeableCounter | Ownable (owner) | deployer | _authorizeUpgrade() |

### 2.3 External Dependencies

| Dependency | Purpose | Address (Base Sepolia) |
|---|---|---|
| Chainlink ETH/USD | Price oracle | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` |
| The Graph Studio | Event indexing | subgraph v0.0.1 |
| Base Sepolia RPC | L2 node | `https://sepolia.base.org` |
| OpenZeppelin v5 | Contract standards | npm package |

---

## 3. Sequence Diagrams

### 3.1 Buy Outcome Shares (Critical User Flow)

```
Trader        MetaMask      MockCollateral    PredictionMarket    OutcomeToken
  │               │               │                  │                │
  │─ approve() ──►│               │                  │                │
  │               │─ approve() ──►│                  │                │
  │               │◄─ tx hash ───│                  │                │
  │               │               │                  │                │
  │─ buyShares() ►│               │                  │                │
  │               │─ buyShares() ──────────────────►│                │
  │               │               │  safeTransferFrom│                │
  │               │               │◄─────────────────│                │
  │               │               │──────────────────►                │
  │               │               │    (collateral transferred)       │
  │               │               │                  │─ mint() ──────►│
  │               │               │                  │◄─ success ─────│
  │               │               │                  │                │
  │               │               │   emit SharesBought               │
  │               │◄──────────────────────── tx receipt ──────────────│
  │◄─ success ───│               │                  │                │
```

### 3.2 Governance: Propose → Vote → Queue → Execute

```
Proposer      GovernanceToken   PredictionGovernor   PredictionTimelock
  │               │                    │                    │
  │─ delegate() ─►│                    │                    │
  │               │ (voting power active)                   │
  │                                    │                    │
  │─ propose() ──────────────────────►│                    │
  │               │     proposalId     │                    │
  │◄──────────────────────────────────│                    │
  │                                    │                    │
  │  [wait 1 day — voting delay]       │                    │
  │                                    │                    │
  │─ castVote(proposalId, 1) ─────────►│                    │
  │◄─────────────────── success ──────│                    │
  │                                    │                    │
  │  [wait 1 week — voting period]     │                    │
  │                                    │                    │
  │─ queue(proposalId) ───────────────►│                    │
  │                         _queueOperations() ────────────►│
  │                                    │    scheduleOperation│
  │◄─────────────────── success ──────│◄───────────────────│
  │                                    │                    │
  │  [wait 2 days — timelock delay]    │                    │
  │                                    │                    │
  │─ execute(proposalId) ─────────────►│                    │
  │                         _executeOperations() ──────────►│
  │                                    │    execute()       │
  │◄─────────────────── success ──────│◄───────────────────│
```

### 3.3 Market Resolution via Chainlink Oracle

```
Resolver      ChainlinkResolver    Chainlink Feed    PredictionMarket
  │               │                    │                  │
  │─ resolveMarket(marketId) ─────────►│                  │
  │               │─ latestRoundData() ►│                  │
  │               │◄─ (price, updatedAt)│                  │
  │               │                    │                  │
  │               │ check: updatedAt > now - 3600s         │
  │               │ check: price > 0                       │
  │               │ compare: price vs strikePrice          │
  │               │                    │                  │
  │               │ emit MarketResolved(outcome)           │
  │◄──────────────│                    │                  │
  │               │                    │                  │
  │─ resolveMarket(outcome) ──────────────────────────────►│
  │               │          state = Resolved             │
  │               │          winningOutcome = outcome     │
  │◄──────────────────────────── emit MarketResolved ─────│
```

---

## 4. Data Model & Storage Layout

### 4.1 PredictionMarket.sol

| Slot | Variable | Type | Size |
|---|---|---|---|
| 0 | `_roles` (AccessControl) | mapping(bytes32 => RoleData) | dynamic |
| 1 | `_status` (ReentrancyGuard) | uint256 | 32 bytes |
| 2 | `collateralToken` | address (immutable) | — |
| 3 | `outcomeToken` | address (immutable) | — |
| 4 | `question` | string | dynamic |
| 5 | `endTime` | uint256 | 32 bytes |
| 6 | `yesReserve` | uint256 | 32 bytes |
| 7 | `noReserve` | uint256 | 32 bytes |
| 8 | `state` | uint8 (enum) | 1 byte |
| 9 | `winningOutcome` | bool | 1 byte |

### 4.2 MarketFactory.sol

| Slot | Variable | Type | Size |
|---|---|---|---|
| 0 | `_roles` (AccessControl) | mapping | dynamic |
| 1 | `collateralToken` | address (immutable) | — |
| 2 | `outcomeToken` | address (immutable) | — |
| 3 | `markets` | address[] | dynamic |
| 4 | `predictedMarkets` | mapping(bytes32 => address) | dynamic |

### 4.3 GovernanceToken.sol

| Slot | Variable | Type |
|---|---|---|
| 0–2 | ERC20 internals (_balances, _allowances, _totalSupply) | mapping/uint256 |
| 3 | `_owner` (Ownable) | address |
| 4–6 | ERC20Votes internals (_delegatee, _checkpoints) | mapping |
| 7 | ERC20Permit nonces | mapping |

### 4.4 UpgradeableCounterV1 (UUPS — storage collision safety)

| Slot | Variable | Type | Notes |
|---|---|---|---|
| 0 | `_initialized` (Initializable) | uint8 | OZ reserved |
| 1 | `_owner` (OwnableUpgradeable) | address | OZ reserved |
| 2 | `count` | uint256 | protocol state |

**V1 → V2 upgrade safety:** V2 inherits V1 and only adds functions (`decrement`, `version`). No new storage variables are added. Storage layout is identical — no collision possible. The `_authorizeUpgrade` function is `onlyOwner` — only the proxy owner can upgrade.

### 4.5 ChainlinkResolver.sol

| Slot | Variable | Type |
|---|---|---|
| 0 | `_roles` | mapping |
| 1 | `resolutions` | mapping(bytes32 => Resolution) |
| 2 | `feeds` | mapping(bytes32 => address) |
| 3 | `strikePrices` | mapping(bytes32 => int256) |

### 4.6 FeeVault.sol (ERC-4626)

| Slot | Variable | Type |
|---|---|---|
| 0–4 | ERC20 + ERC4626 internals | various |
| 5 | `_roles` (AccessControl) | mapping |
| 6 | `totalFeesCollected` | uint256 |

---

## 5. Trust Assumptions

### 5.1 Role Holders and Their Powers

| Actor | Powers | Risk if compromised |
|---|---|---|
| **Deployer (DEFAULT_ADMIN)** | Grant/revoke all roles on all contracts | Can grant RESOLVER_ROLE to attacker, enabling fraudulent market resolution |
| **MARKET_CREATOR_ROLE** | Create new markets with arbitrary parameters | Can create markets with manipulated initial reserves |
| **RESOLVER_ROLE** | Resolve markets (set winning outcome) | Can incorrectly resolve market, causing incorrect payouts |
| **GovernanceToken Owner** | Mint up to 100M PRED tokens | Can dilute voting power, take over governance |
| **PredictionTimelock** | Execute queued governance actions after 2 days | If bypassed, governance actions execute immediately |
| **PredictionGovernor** | Propose and execute protocol changes | Governance capture enables arbitrary protocol changes |

### 5.2 Timelock Powers

The PredictionTimelock controls:
- Any protocol parameter changes proposed through governance
- Treasury funds held by the timelock
- Role assignments that pass through governance

The 2-day delay gives the community time to react to malicious proposals before execution.

### 5.3 Multisig Compromise Scenario

If the deployer private key is compromised:
1. Attacker can grant RESOLVER_ROLE to themselves and resolve all markets fraudulently
2. Attacker can mint maximum PRED supply and take over governance voting
3. Mitigation: Transfer DEFAULT_ADMIN_ROLE to a Gnosis Safe multisig immediately after deployment; revoke deployer's admin role

---

## 6. Design Decisions Log (ADR)

### ADR-001: CPMM over LMSR for AMM pricing

**Context:** Prediction markets require an automated market maker for price discovery.

**Options considered:**
- LMSR (Logarithmic Market Scoring Rule): mathematically optimal for prediction markets, bounded loss
- CPMM (Constant Product x·y=k): simpler, battle-tested (Uniswap), easier to audit

**Decision:** CPMM with 0.3% fee.

**Consequences:** Simpler code reduces attack surface. Price range [0,1] is naturally enforced by reserve ratios. LP fees incentivize liquidity provision.

---

### ADR-002: ERC-1155 for outcome shares instead of ERC-20 pairs

**Context:** Each market needs YES and NO tokens for traders.

**Options considered:**
- Two ERC-20 contracts per market (high gas, complex deployment)
- Single ERC-1155 with token ID 0=YES, 1=NO

**Decision:** ERC-1155 with shared OutcomeToken contract.

**Consequences:** Single contract manages all markets' outcome tokens. Gas-efficient batch operations possible. Requires MINTER_ROLE discipline.

---

### ADR-003: CREATE2 for deterministic market addresses

**Context:** Frontend and subgraph benefit from knowing market addresses before deployment.

**Options considered:**
- Only CREATE (simple, sequential addresses)
- CREATE + CREATE2 (predictable addresses via salt)

**Decision:** Support both via `createMarket()` and `createMarketDeterministic()`.

**Consequences:** Enables pre-deployment UI configuration and cross-chain address consistency. Salt must be unique per market to avoid collision.

---

### ADR-004: 2-day Timelock delay

**Context:** Governance actions need a delay to allow community reaction.

**Options considered:**
- 1 day: faster governance, less protection
- 2 days: reasonable protection, still practical
- 7 days: maximum security, too slow for a testnet demo

**Decision:** 2-day minimum delay (MIN_DELAY = 2 days).

**Consequences:** Satisfies course requirements. Provides meaningful protection against flash governance attacks on mainnet.

---

### ADR-005: UUPS over Transparent Proxy

**Context:** UpgradeableCounter requires upgradeability pattern.

**Options considered:**
- Transparent Proxy: admin-proxy conflict, higher gas
- UUPS: upgrade logic in implementation, lower gas, more control

**Decision:** UUPS with `_authorizeUpgrade` protected by `onlyOwner`.

**Consequences:** Implementation controls its own upgrade path. V2 safely adds `decrement()` and `version()` without storage collision.

---

### ADR-006: Chainlink staleness threshold of 3600 seconds

**Context:** Oracle data can become stale if Chainlink heartbeat fails.

**Options considered:**
- 1800s (30 min): too strict, false reverts possible
- 3600s (1 hour): matches ETH/USD heartbeat
- 86400s (1 day): too permissive

**Decision:** STALENESS_THRESHOLD = 3600 seconds with 2-hour DISPUTE_WINDOW.

**Consequences:** Reverts if price older than 1 hour. 2-hour dispute window after resolution allows challenges before payouts unlock.
