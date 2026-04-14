# Soroban Contracts - SoundMint

This folder contains on-chain contracts for SoundMint:

- `music_nft`: mint and transfer music NFT records
- `marketplace`: listing and buy flow with royalty math

## Prerequisites

- Rust toolchain (`cargo`, `rustc`)
- wasm target (`wasm32v1-none` recommended)
- Stellar CLI (`stellar` command)

## Build and Test

PowerShell:

```powershell
cd contracts
./scripts/build-contracts.ps1
./scripts/test-contracts.ps1
```

Bash:

```bash
cd contracts
./scripts/build-contracts.sh
./scripts/test-contracts.sh
```

## Deploy Contracts

PowerShell:

```powershell
cd contracts
./scripts/deploy-contracts.ps1 -SourceIdentity YOUR_IDENTITY
```

Bash:

```bash
cd contracts
./scripts/deploy-contracts.sh YOUR_IDENTITY
```

Both scripts generate `contracts/deploy-output.env` with:

- `MUSIC_NFT_CONTRACT_ID`
- `MARKETPLACE_CONTRACT_ID`

Copy these values into `frontend/.env` for direct client-side contract calls.
