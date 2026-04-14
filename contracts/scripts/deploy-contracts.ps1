param(
    [Parameter(Mandatory = $true)]
    [string]$SourceIdentity,

    [string]$Network = "testnet",
    [string]$RpcUrl = "https://soroban-testnet.stellar.org",
    [string]$NetworkPassphrase = "Test SDF Network ; September 2015",
    [string]$Target = "wasm32v1-none"
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command stellar -ErrorAction SilentlyContinue)) {
    throw "stellar CLI not found. Restart terminal."
}

$wasmDir = Join-Path (Get-Location) ("target/{0}/release" -f $Target)
$musicWasm = Join-Path $wasmDir "music_nft.wasm"
$marketWasm = Join-Path $wasmDir "marketplace.wasm"

if (-not (Test-Path $musicWasm) -or -not (Test-Path $marketWasm)) {
    throw "Missing wasm artifacts. Run build script first."
}

try {
    stellar network add $Network `
        --rpc-url $RpcUrl `
        --network-passphrase "$NetworkPassphrase" | Out-Null
} catch {
    Write-Host "Network already exists, continuing..."
}

Write-Host "Deploying music_nft contract to Testnet..."
$musicId = (stellar contract deploy `
    --wasm $musicWasm `
    --source $SourceIdentity `
    --network $Network).Trim()

Write-Host "Deploying marketplace contract to Testnet..."
$marketId = (stellar contract deploy `
    --wasm $marketWasm `
    --source $SourceIdentity `
    --network $Network).Trim()

$outputPath = Join-Path (Get-Location) "deploy-output.env"
@(
    "VITE_SOROBAN_RPC_URL=$RpcUrl"
    "VITE_SOROBAN_NETWORK_PASSPHRASE=$NetworkPassphrase"
    "VITE_MUSIC_NFT_CONTRACT_ID=$musicId"
    "VITE_MARKETPLACE_CONTRACT_ID=$marketId"
) | Set-Content -Path $outputPath -Encoding UTF8

Write-Host ""
Write-Host "✅ Deployment complete on TESTNET"
Write-Host "MUSIC_NFT_CONTRACT_ID=$musicId"
Write-Host "MARKETPLACE_CONTRACT_ID=$marketId"
Write-Host "Saved IDs to $outputPath"