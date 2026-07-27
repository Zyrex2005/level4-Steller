#!/usr/bin/env bash
# Deploy the Reputation + Escrow contracts to Stellar Testnet using stellar-cli.
#
# Prerequisites:
#   1. Install the CLI:  cargo install --locked stellar-cli
#   2. Create/fund an identity: stellar keys generate deployer --network testnet --fund
#
# Usage:
#   ./scripts/deploy.sh
#
# This script prints every contract ID and transaction hash it produces --
# copy those into your README / submission checklist.

set -euo pipefail

NETWORK="testnet"
SOURCE_ACCOUNT="deployer"

echo "==> Building contracts to WASM"
cargo build --target wasm32-unknown-unknown --release -p reputation-contract
cargo build --target wasm32-unknown-unknown --release -p escrow-contract

REPUTATION_WASM="target/wasm32-unknown-unknown/release/reputation_contract.wasm"
ESCROW_WASM="target/wasm32-unknown-unknown/release/escrow_contract.wasm"

echo "==> Deploying Reputation contract"
REPUTATION_ID=$(stellar contract deploy \
  --wasm "$REPUTATION_WASM" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")
echo "Reputation contract ID: $REPUTATION_ID"

echo "==> Deploying Escrow contract"
ESCROW_ID=$(stellar contract deploy \
  --wasm "$ESCROW_WASM" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")
echo "Escrow contract ID: $ESCROW_ID"

DEPLOYER_ADDRESS=$(stellar keys address "$SOURCE_ACCOUNT")

echo "==> Initializing Reputation contract (authorized_caller = Escrow contract)"
stellar contract invoke \
  --id "$REPUTATION_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS" \
  --authorized_caller "$ESCROW_ID"

echo "==> Initializing Escrow contract (reputation_contract = Reputation contract)"
stellar contract invoke \
  --id "$ESCROW_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS" \
  --reputation_contract "$REPUTATION_ID"

cat <<EOF

==================================================
Deployment complete.

Reputation contract: $REPUTATION_ID
Escrow contract:      $ESCROW_ID
Admin / deployer:     $DEPLOYER_ADDRESS

Next steps:
  1. Put these two contract IDs into frontend/.env.local
     (NEXT_PUBLIC_ESCROW_CONTRACT_ID / NEXT_PUBLIC_REPUTATION_CONTRACT_ID)
  2. Run a test create_escrow + release from the CLI or the UI and copy
     the resulting transaction hash into your README for the submission
     checklist ("Transaction hash for contract interaction").
==================================================
EOF
