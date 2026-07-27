# Architecture

## Why two contracts

A single "escrow" contract could technically store a reputation score inline,
but that would mean any future contract wanting to read/write reputation
(a second marketplace, a dispute-arbitration contract, etc.) would have to be
baked into the escrow contract itself. Splitting it in two mirrors how
production Soroban systems are actually composed:

- **`reputation-contract`** — a small, generic ledger of `(address -> score)`.
  It has no idea what an "escrow" is. It only knows one caller is allowed to
  write to it (`authorized_caller`), set once at `initialize` and rotatable
  by the admin via `set_authorized_caller`.
- **`escrow-contract`** — owns the actual business logic and token custody.
  On every deal resolution it makes a **synchronous cross-contract call**
  into the reputation contract via `env.invoke_contract`.

## Inter-contract communication

`escrow-contract::rate_participant` is the integration point:

```rust
let _: Val = env.invoke_contract(
    &reputation_contract,
    &Symbol::new(env, "record_rating"),
    (this_contract, subject.clone(), points, was_dispute).into_val(env),
);
```

Key properties this gives us, all for free from the Soroban host:

1. **Atomicity.** The `record_rating` call happens inside the same
   transaction as the token transfer and status update. If the reputation
   contract traps (e.g. because someone renamed the authorized caller and
   the call is now unauthorized), the *entire* escrow transaction reverts —
   the buyer doesn't lose funds and the seller doesn't wrongly keep a
   payment with no reputation update.
2. **No shared secrets.** The reputation contract doesn't trust the escrow
   contract because of an API key or hardcoded address check alone — it
   also requires `caller.require_auth()`. Contracts auto-authorize their own
   direct invocations within a call stack, so this "just works" without a
   wallet signature, but a completely different contract calling
   `record_rating` directly (not through escrow) will fail because its own
   address won't match `authorized_caller`.
3. **Upgradability.** If the escrow contract is redeployed (new contract ID),
   the admin calls `reputation.set_authorized_caller(new_escrow_id)` and
   history keeps accumulating on the same reputation ledger.

## Event streaming & real-time updates

Both contracts call `env.events().publish(...)` on every state change:

| Contract | Event topic | Payload |
|---|---|---|
| escrow | `created`, escrow id | `(buyer, seller, amount)` |
| escrow | `released`, escrow id | `seller` |
| escrow | `disputed`, escrow id | `caller` |
| escrow | `resolved`, escrow id | `refund_buyer: bool` |
| reputation | `rating`, subject address | `(total_points, completed_deals, disputes)` |

Soroban RPC doesn't currently push events over a socket, so the frontend
(`frontend/src/hooks/useEscrows.ts`) polls `getEvents` every 5 seconds from
the last-seen ledger and merges any changes into React state — the same
pattern you'd swap out for a real websocket/indexer later without touching
the contracts.

## Production-readiness choices

- **Errors are typed**, not stringly-typed panics (`EscrowError`,
  `ReputationError` via `#[contracterror]`), so the frontend can branch on
  a stable error code instead of parsing panic messages.
- **Storage is split** between `instance` (small, admin/config, rent-paid
  with the contract itself) and `persistent` (per-escrow, per-address data
  that should outlive incidental contract calls).
- **State machine guards.** Every mutating function checks `Status` before
  acting (`WrongStatus`), so e.g. a released escrow can never be disputed
  or released twice — covered explicitly in `contracts/escrow/src/test.rs`.
- **Frontend never trusts the happy path.** Every contract call in
  `lib/soroban.ts` goes through simulate → (optional) sign → submit →
  poll-until-confirmed, with a dedicated `ContractCallError` type so the UI
  can render a real error state instead of an unhandled rejection.
