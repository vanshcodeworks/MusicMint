param(
    [string]$Target = "wasm32v1-none"
)

$ErrorActionPreference = "Stop"
# If your script is in a /scripts folder, this goes back to root. If it's already in root, remove the ".."
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Building music_nft for target $Target..."
cargo build --release --target $Target -p music_nft

Write-Host "Building marketplace for target $Target..."
cargo build --release --target $Target -p marketplace

$wasmDir = Join-Path (Get-Location) ("target/{0}/release" -f $Target)
Write-Host "✅ WASM artifacts available in $wasmDir"