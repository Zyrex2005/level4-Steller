# 1–2 Minute Demo Video Script

Goal: show the reviewer the full loop — wallet connect, fund escrow, confirm
delivery, reputation update, dispute path, and CI passing — without padding.

**0:00–0:10 — Hook**
"This is Ledger & Seal: a Stellar/Soroban escrow marketplace where
completing a deal automatically updates the seller's on-chain reputation —
no backend, two contracts talking to each other."

**0:10–0:30 — Create an escrow**
- Connect Freighter wallet (show address in header).
- Fill the "New deal" form: seller address, asset, amount, description.
- Submit, show the "Sealing manifest…" loading state, then the confirmed
  transaction hash toast.
- Point out the new row appearing in the Manifest list within a few seconds
  (event polling, not a manual refresh).

**0:30–0:50 — Release funds + reputation update**
- Switch to (or mention) the buyer account, click "Confirm delivery."
- Show the status seal flip from Funded → Released.
- Show the ReputationBadge score increase for the seller address — this is
  the cross-contract call landing (`escrow.release` → `reputation.record_rating`).

**0:50–1:05 — Dispute path (optional if time allows)**
- Quickly show `raise_dispute` / `resolve_dispute` via CLI or a second demo
  escrow, and the Disputed seal styling.

**1:05–1:20 — Engineering proof**
- Screen-record: `cargo test --workspace` output (green, 9+ passing tests).
- Screen-record: GitHub Actions tab, both `contracts` and `frontend` jobs green.
- Quick flash of the responsive layout on a narrow viewport (DevTools device
  toolbar or an actual phone).

**1:20–1:30 — Close**
"Contracts are deployed on Testnet at <ESCROW_CONTRACT_ID> and
<REPUTATION_CONTRACT_ID>, live demo is at <VERCEL_URL>, full source and docs
are on GitHub."

## Recording checklist
- [ ] Record at 1080p, landscape, screen + optional webcam corner.
- [ ] Keep browser console open (small) for one shot showing no unhandled errors.
- [ ] Have testnet Freighter accounts pre-funded via friendbot beforehand.
- [ ] Trim dead air / long transaction waits in editing; testnet confirmation
      can take 5–10s, don't make the viewer sit through it live.
