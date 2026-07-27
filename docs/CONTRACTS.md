# Smart Contract Gas & Resource Optimization Guide (`CONTRACTS.md`)

This document outlines the architecture, storage optimization strategies, TTL management, resource metering, and gas considerations for the **SkillEscrow** (`escrow_contract`) and **Reputation** (`reputation_contract`) Soroban smart contracts.

---

## 1. Storage Architecture & Efficiency

Soroban uses three distinct storage tiers: **Instance**, **Persistent**, and **Temporary**. Storage efficiency is critical because read/write CPU cycles and byte footprints directly determine transaction gas costs on the Stellar network.

| Storage Type | Usage in SkillEscrow | Rationale |
| --- | --- | --- |
| **Instance Storage** | Admin Address, Reputation Contract Address, Next Job ID counter | Frequently accessed global configuration with small byte size (~100 bytes total). Shared TTL across all instance reads. |
| **Persistent Storage** | Job Entries (`DataKey::Job(u64)`), User Reputation (`DataKey::Reputation(Address)`) | Long-lived records that must persist indefinitely across jobs and freelancer rating histories. Auto-bumped via `extend_ttl`. |
| **Temporary Storage** | Not used for core records | Saved for short-lived computational state to avoid paying permanent state creation fees. |

### Data Footprint Minimization
- **Job Struct Size:** The `Job` struct contains 8 compact fields (`client`, `freelancer`, `token`, `amount: i128`, `description: String`, `deadline: u64`, `status: Status`, `rated: bool`).
- **Reputation Struct Size:** The `Reputation` struct stores `total_score: u32` and `rating_count: u32` (~8 bytes body), enabling fast O(1) reads and updates without unbounded array growth.

---

## 2. TTL (Time-To-Live) & Rent Bump Strategy

On Stellar Soroban, persistent entries require rent upkeep to prevent archiving. Every state-mutating function in SkillEscrow executes explicit TTL extension calls:

```rust
// Auto-bump instance storage TTL (minimum 1,000 ledgers, maximum target 5,000 ledgers)
env.storage().instance().extend_ttl(1000, 5000);

// Auto-bump persistent job storage TTL on write and read
let key = DataKey::Job(job_id);
env.storage().persistent().extend_ttl(&key, 1000, 5000);
```

- **Read-Path TTL Bumps:** `get_job` and `get_reputation` automatically call `extend_ttl` so active jobs remain un-archived during active client-freelancer interactions.
- **Write-Path Safety:** `create_job`, `fund_job`, `complete_job`, `refund_job`, and `submit_rating` refresh rent bounds at every transition step.

---

## 3. Hot-Path Function Analysis & Resource Footprint

### 1. `create_job`
- **Reads:** 1 Instance Read (`NEXT_ID_KEY`)
- **Writes:** 1 Persistent Write (`DataKey::Job(id)`), 1 Instance Write (`NEXT_ID_KEY`)
- **Validation:** `amount > 0`, `client.require_auth()`
- **Event:** Emits `symbol_short!("created")` with `(client, freelancer, amount)`

### 2. `fund_job`
- **Reads:** 1 Persistent Read (`DataKey::Job(job_id)`)
- **Writes:** 1 Persistent Write (`DataKey::Job(job_id)` with `Status::Funded`)
- **Token Operations:** 1 Cross-contract `token.transfer(client -> contract)`
- **Auth Guard:** `job.client.require_auth()`

### 3. `complete_job`
- **Reads:** 1 Persistent Read (`DataKey::Job(job_id)`)
- **Writes:** 1 Persistent Write (`DataKey::Job(job_id)` with `Status::Completed`)
- **Token Operations:** 1 Cross-contract `token.transfer(contract -> freelancer)`
- **Auth Guard:** `job.client.require_auth()`

### 4. `submit_rating` (Cross-Contract Hot Path)
- **Reads:** 1 Persistent Read (`DataKey::Job(job_id)`), 1 Instance Read (`REP_KEY`)
- **Writes:** 1 Persistent Write (`DataKey::Job(job_id)` with `rated = true`)
- **Cross-Contract Call:** Invokes `ReputationContract::add_rating(freelancer, score)` which performs 1 Persistent Read/Write on `DataKey::Reputation(freelancer)`.

---

## 4. Custom Error Codes & Security Guards

All invalid operations reject early to save gas:

| Error Name | Code | Trigger Condition |
| --- | --- | --- |
| `AlreadyInitialized` | 1 | Re-calling `initialize` on an already active contract |
| `NotInitialized` | 2 | Invoking methods before contract initialization |
| `NotFound` | 3 | Querying a non-existent `job_id` |
| `InvalidStatus` | 4 | Funding an already funded job, or completing an un-funded job |
| `Unauthorized` | 5 | Caller lacks signature for required address |
| `DeadlineNotPassed` | 6 | Requesting refund before job deadline timestamp |
| `AlreadyRated` | 7 | Submitting multiple ratings for the same completed job |
| `InvalidAmount` | 8 | Creating a job with amount <= 0 |
| `InvalidScore` | 9 | Submitting a rating score > 5 |
