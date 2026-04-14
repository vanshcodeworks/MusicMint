#!/usr/bin/env bash
set -euo pipefail

SOURCE_IDENTITY="${1:-}"
NETWORK="${2:-testnet}"
RPC_URL="${3:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${4:-Test SDF Network ; September 2015}"
TARGET="${5:-wasm32v1-none}"

if [[ -z "$SOURCE_IDENTITY" ]]; then
  echo "Usage: ./deploy-contracts.sh <source-identity> [network] [rpc-url] [network-passphrase] [target]"
  exit 1
fi

if ! command -v stellar >/dev/null 2>&1; then
  echo "stellar CLI not found in PATH"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

MUSIC_WASM="target/$TARGET/release/music_nft.wasm"
MARKET_WASM="target/$TARGET/release/marketplace.wasm"

if [[ ! -f "$MUSIC_WASM" || ! -f "$MARKET_WASM" ]]; then
  echo "Missing wasm artifacts. Run ./scripts/build-contracts.sh first"
  exit 1
fi

stellar network add --global "$NETWORK" --rpc-url "$RPC_URL" --network-passphrase "$NETWORK_PASSPHRASE" >/dev/null 2>&1 || true

MUSIC_ID="$(stellar contract deploy --wasm "$MUSIC_WASM" --source "$SOURCE_IDENTITY" --network "$NETWORK")"
MARKET_ID="$(stellar contract deploy --wasm "$MARKET_WASM" --source "$SOURCE_IDENTITY" --network "$NETWORK")"

cat <<EOF > deploy-output.env
MUSIC_NFT_CONTRACT_ID=$MUSIC_ID
MARKETPLACE_CONTRACT_ID=$MARKET_ID
EOF

echo "MUSIC_NFT_CONTRACT_ID=$MUSIC_ID"
echo "MARKETPLACE_CONTRACT_ID=$MARKET_ID"
echo "Saved deploy-output.env"
