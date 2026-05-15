# Security Audit Report
## On-Chain Prediction Market Protocol
**Version:** 1.0.0 | **Date:** May 2025 | **Network:** Base Sepolia
**Auditors:** Team — Blockchain Technologies 2 Final Project

---

## Executive Summary

This internal security audit covers the On-Chain Prediction Market protocol deployed on Base Sepolia. The protocol implements binary YES/NO prediction markets using a constant-product AMM (CPMM), ERC-1155 outcome shares, an ERC-4626 fee vault, Chainlink oracle integration, and full OpenZeppelin Governor-based DAO governance.

The audit was conducted through manual code review, static analysis via Slither, and targeted test-based proof-of-concept for identified vulnerabilities. Two vulnerabilities (one reentrancy, one access control) were reproduced and fixed with corresponding before/after tests.

**Overall Risk Rating: LOW** — No Critical or High severity findings remain at submission. The protocol correctly applies OpenZeppelin's battle-tested libraries, ReentrancyGuard, SafeERC20, and AccessControl throughout.

---

## Scope

**Commit hash:** `main` branch (latest at submission)

**Files in scope:**
- `contracts/core/PredictionMarket.sol`
- `contracts/core/MarketFactory.sol`
- `contracts/core/MathUtils.sol`
- `contracts/tokens/OutcomeToken.sol`
- `contracts/tokens/FeeVault.sol`
- `contracts/oracle/ChainlinkResolver.sol`
- `contracts/governance/GovernanceToken.sol`
- `contracts/governance/PredictionGovernor.sol`
- `contracts/governance/PredictionTimelock.sol`
- `contracts/upgradeable/UpgradeableCounterV1.sol`
- `contracts/upgradeable/UpgradeableCounterV2.sol`

**Files out of scope:**
- `contracts/mocks/` — test-only contracts
- `frontend/` — off-chain code
- `subgraph/` — off-chain indexing
- `test/` — test suite files
- `scripts/` — deployment scripts

---

## Methodology

**Tools used:**
- **Slither** v0.10.x — automated static analysis
- **Hardhat** — test execution and coverage
- **Manual review** — line-by-line inspection of all in-scope contracts
- **OpenZeppelin Defender** — role and access control mapping

**Review approach:**
1. Map all external/public functions and identify trust boundaries
2. Trace all token flows (mint, burn, transfer, approve)
3. Verify CEI (Checks-Effects-Interactions) pattern at every state-changing function
4. Verify all roles and access controls
5. Identify oracle dependency risks
6. Run Slither and triage all findings
7. Write proof-of-concept tests for suspicious patterns

---

## Findings Table

| ID | Title | Severity | Location | Status |
|---|---|---|---|---|
| S-01 | Reentrancy in buyShares before token transfer | High | PredictionMarket.sol:93 | Fixed |
| S-02 | Missing access control on OutcomeToken mint | High | OutcomeToken.sol:28 | Fixed |
| S-03 | Integer overflow in reserve update (theoretical) | Low | PredictionMarket.sol:97 | Acknowledged |
| S-04 | Centralized RESOLVER_ROLE — single point of failure | Low | PredictionMarket.sol:17 | Acknowledged |
| S-05 | Stale price not checked in all execution paths | Informational | ChainlinkResolver.sol:52 | Fixed |
| S-06 | FeeVault depositFees not called by markets | Informational | FeeVault.sol:38 | Acknowledged |
| S-07 | MathUtils Yul mul — no overflow protection | Gas/Info | MathUtils.sol:22 | Acknowledged |
| S-08 | CREATE2 salt reuse not prevented across markets | Informational | MarketFactory.sol:55 | Acknowledged |

---

## Detailed Findings

### S-01 — Reentrancy in buyShares before token transfer
**Severity:** High (Fixed)
**Location:** `PredictionMarket.sol:93-110`

**Description:**
In an earlier version of `buyShares`, the state update (`yesReserve`, `noReserve`) and `outcomeToken.mint()` call occurred after the external `collateralToken.safeTransferFrom()` call. A malicious ERC-20 token with a callback hook (e.g., ERC-777) could re-enter `buyShares` before state was updated.

**Impact:**
An attacker using a malicious collateral token contract with a receive hook could re-enter `buyShares` and drain reserves by receiving more shares than entitled.

**Proof of Concept (before fix):**
```solidity
// Vulnerable order (simplified):
collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn); // external call first
noReserve += collateralIn - fee;   // state update after — vulnerable
outcomeToken.mint(msg.sender, ...); // another external call
```

**Recommendation:**
Apply CEI pattern: update all state before any external calls. Additionally add `ReentrancyGuard`.

**Fix applied:**
```solidity
// Fixed order in current code:
noReserve += collateralIn - fee;   // state update first
yesReserve -= sharesOut;           // state update
outcomeToken.mint(...);            // external call
collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn); // last
```
Additionally, `ReentrancyGuard` (`nonReentrant` modifier) is applied to both `buyShares` and `sellShares`.

**Status:** Fixed — `nonReentrant` modifier present on all state-changing functions.

---

### S-02 — Missing access control on OutcomeToken mint/burn
**Severity:** High (Fixed)
**Location:** `OutcomeToken.sol:28-36`

**Description:**
In an earlier version, `mint()` and `burn()` on `OutcomeToken` lacked access control, allowing any address to mint arbitrary amounts of YES/NO shares.

**Impact:**
Any attacker could mint unbounded YES shares and call `claimPayout()` to drain all collateral from `PredictionMarket` after resolution.

**Proof of Concept (before fix):**
```solidity
// Attacker contract:
outcomeToken.mint(attacker, YES, 1_000_000e18, ""); // no access control
predictionMarket.claimPayout(); // drain all collateral
```

**Recommendation:**
Add `MINTER_ROLE` via OpenZeppelin AccessControl and restrict `mint`/`burn` to role holders only.

**Fix applied:**
```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

function mint(address to, uint256 id, uint256 amount, bytes memory data)
    external
    onlyRole(MINTER_ROLE)  // ← access control added
{
    _mint(to, id, amount, data);
}
```

**Status:** Fixed — `MINTER_ROLE` required for all mint/burn operations.

---

### S-03 — Theoretical integer overflow in reserve update
**Severity:** Low
**Location:** `PredictionMarket.sol:97-100`

**Description:**
Reserve additions (`noReserve += collateralIn - fee`) could theoretically overflow if reserves grew beyond `type(uint256).max`. In practice this is impossible with real collateral token supplies.

**Impact:** Negligible — requires more tokens than exist in the universe.

**Recommendation:** Solidity 0.8.x has built-in overflow protection — this reverts automatically. No action needed.

**Status:** Acknowledged — Solidity 0.8.24 protects against overflow by default.

---

### S-04 — Centralized RESOLVER_ROLE — single point of failure
**Severity:** Low
**Location:** `PredictionMarket.sol:17`, `ChainlinkResolver.sol:8`

**Description:**
`RESOLVER_ROLE` is held by the deployer EOA. If the private key is compromised, an attacker can incorrectly resolve all open markets.

**Impact:** All open market outcomes could be falsified, causing incorrect payouts.

**Recommendation:** Transfer `RESOLVER_ROLE` to a Gnosis Safe multisig. For mainnet: integrate automated Chainlink resolver with on-chain proof verification.

**Status:** Acknowledged — acceptable for testnet deployment. Mainnet would require multisig.

---

### S-05 — Stale price not checked before dispute window
**Severity:** Informational (Fixed)
**Location:** `ChainlinkResolver.sol:52`

**Description:**
The staleness check `updatedAt < block.timestamp - STALENESS_THRESHOLD` correctly reverts on stale prices. An earlier version did not revert and used the stale price silently.

**Fix applied:**
```solidity
if (updatedAt < block.timestamp - STALENESS_THRESHOLD)
    revert StalePrice(updatedAt, block.timestamp - STALENESS_THRESHOLD);
```

**Status:** Fixed.

---

### S-06 — FeeVault depositFees not called by markets
**Severity:** Informational
**Location:** `FeeVault.sol:38`, `PredictionMarket.sol`

**Description:**
`FeeVault` is deployed and LP providers can deposit, but `PredictionMarket.buyShares` does not call `FeeVault.depositFees()`. Collected fees remain inside the market contract.

**Impact:** LP providers do not receive fee yield. The vault still functions as a deposit/withdrawal vault but without protocol fee accrual.

**Recommendation:** In a production version, `buyShares` and `sellShares` should transfer `fee` amount to `FeeVault.depositFees()` after granting the market `FEE_DEPOSITOR_ROLE`.

**Status:** Acknowledged — out of scope for testnet demonstration.

---

### S-07 — MathUtils Yul mul has no overflow protection
**Severity:** Gas/Informational
**Location:** `MathUtils.sol:22`

**Description:**
```solidity
function multiplyYul(uint256 x, uint256 y) external pure returns (uint256 result) {
    assembly {
        result := mul(x, y)  // no overflow check
    }
}
```
Yul `mul` does not revert on overflow unlike Solidity 0.8.x. If called with large inputs, result silently wraps.

**Impact:** Only affects `MathUtils` which is a benchmark utility, not used in core logic.

**Recommendation:** For production Yul code, add explicit overflow checks:
```solidity
assembly {
    result := mul(x, y)
    if iszero(eq(div(result, x), y)) { revert(0, 0) }
}
```

**Status:** Acknowledged — MathUtils is a benchmarking utility only.

---

### S-08 — CREATE2 salt reuse not prevented
**Severity:** Informational
**Location:** `MarketFactory.sol:55`

**Description:**
`createMarketDeterministic()` does not revert if the same salt is used twice. The second call would revert at the EVM level (address already has code), but the error message is opaque.

**Recommendation:** Add explicit check:
```solidity
require(predictedMarkets[salt] == address(0), "Salt already used");
```

**Status:** Acknowledged — EVM-level protection prevents actual harm.

---

## Centralization Analysis

| Power | Holder | Risk |
|---|---|---|
| Mint GovernanceToken | GovernanceToken owner (deployer EOA) | Can dilute all voters, take over governance |
| Resolve markets | RESOLVER_ROLE holder (deployer EOA) | Can falsify all market outcomes |
| Create markets | MARKET_CREATOR_ROLE (deployer EOA) | Can create manipulated markets |
| Upgrade proxy | UpgradeableCounter owner (deployer EOA) | Can upgrade to malicious implementation |
| Execute Timelock actions | PredictionTimelock | 2-day delay limits damage |

**Mitigations in place:**
- GovernanceToken has `MAX_SUPPLY = 100,000,000` — minting is bounded
- All privileged functions use OpenZeppelin AccessControl — no unguarded admin functions
- PredictionTimelock enforces 2-day delay on all governance-executed actions
- `tx.origin` is never used for authorization
- No `transfer()` or `send()` for ETH — all ERC-20 interactions use SafeERC20

---

## Governance Attack Analysis

### Flash-Loan Governance Attack
**Threat:** An attacker borrows large amounts of PRED via flash loan, votes on a proposal, repays.

**Defense:** `PredictionGovernor` uses `GovernorVotes` which snapshots voting power at the proposal's creation block (via `ERC20Votes` checkpoints). Tokens borrowed after the snapshot do not count. Flash loans cannot be used to influence existing proposals.

### Whale Attack
**Threat:** A whale holding >50% of PRED can pass any proposal unilaterally.

**Defense:** The 2-day `PredictionTimelock` delay gives remaining token holders time to observe, react, and exit before execution. On mainnet, a Gnosis Safe guardian with veto power would be recommended.

### Proposal Spam
**Threat:** Attacker floods governance with spam proposals to grief the system.

**Defense:** `proposalThreshold = 1e18` (1 PRED token) is required to submit a proposal. An attacker needs to hold at least 1 PRED. For mainnet, threshold should be raised to 1% of supply.

### Timelock Bypass
**Threat:** Attacker finds a way to execute operations without the 2-day delay.

**Defense:** `PredictionTimelock` inherits from OpenZeppelin `TimelockController`. Only the Governor contract has `PROPOSER_ROLE` on the Timelock. No direct execution path exists outside the governance flow. The `MIN_DELAY` constant is set at construction and cannot be changed without governance.

---

## Oracle Attack Analysis

### Price Manipulation
**Threat:** Attacker manipulates Chainlink ETH/USD price to trigger incorrect market resolution.

**Defense:** Chainlink price feeds aggregate multiple data sources. Single-source manipulation is cost-prohibitive. The `DISPUTE_WINDOW = 2 hours` allows challenges after resolution before payouts unlock.

### Stale Price Attack
**Threat:** Chainlink heartbeat fails; attacker resolves market with outdated price.

**Defense:** `ChainlinkResolver` enforces `STALENESS_THRESHOLD = 3600 seconds`. Any price older than 1 hour causes the `resolveMarket()` call to revert with `StalePrice` error.

```solidity
if (updatedAt < block.timestamp - STALENESS_THRESHOLD)
    revert StalePrice(updatedAt, block.timestamp - STALENESS_THRESHOLD);
```

### Feed Depeg / Zero Price
**Threat:** Chainlink feed returns zero or negative price during extreme market conditions.

**Defense:** Explicit check in `ChainlinkResolver.resolveMarket()`:
```solidity
if (price <= 0) revert InvalidPrice();
```

---

## Slither Output (Appendix)

Slither was run with:
```bash
slither contracts/ --exclude-dependencies
```

**High findings:** 0
**Medium findings:** 0
**Low findings:** 3 (all acknowledged above — S-03, S-04, S-08)
**Informational:** 5 (all acknowledged or fixed above)

Summary of Slither informational findings:
- `assembly` usage in `MathUtils.sol` — intentional (benchmark)
- `block.timestamp` comparison in `PredictionMarket` — not used for randomness, only deadline enforcement
- Missing events on some admin functions in `FeeVault` — acknowledged
- `abi.encodePacked` with dynamic types in `MarketFactory.predictMarketAddress` — no hash collision risk here as types are fixed-size addresses and uint256
- Unused return value from `mint()` in `OutcomeToken` — return value is void, no issue
