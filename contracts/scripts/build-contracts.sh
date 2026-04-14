#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-wasm32v1-none}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

cargo build --release --target "$TARGET" -p music_nft
cargo build --release --target "$TARGET" -p marketplace

echo "WASM artifacts: target/$TARGET/release"
