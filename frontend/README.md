# SoundMint Frontend

React + TypeScript frontend for the SoundMint Stellar Soroban MVP.

## Features

- Freighter wallet connect/disconnect
- Wallet persistence across page refresh
- Direct Soroban RPC reads and writes from frontend
- Mint music NFTs (`music_nft` contract)
- Create marketplace listings with quantity (`marketplace` contract)
- Buy listing units with on-chain royalty flow
- Dashboard views for minted NFTs, active listings, and sale history

## Prerequisites

- Node.js 20+
- npm
- Freighter extension (testnet enabled)

## Environment Setup

Create `.env` from `.env.example` and set values:

```bash
cp .env.example .env
```

Required variables:

- `VITE_SOROBAN_RPC_URL`
- `VITE_SOROBAN_NETWORK_PASSPHRASE`
- `VITE_MUSIC_NFT_CONTRACT_ID`
- `VITE_MARKETPLACE_CONTRACT_ID`
- `VITE_TESTNET_XLM_CONTRACT_ID`
- `VITE_SOROBAN_POLL_ATTEMPTS`
- `VITE_SOROBAN_BASE_FEE`


## Scripts

```bash
npm install
npm run dev      # local dev server
npm run lint     # eslint
npm run build    # typecheck + production build
npm run preview  # preview production build
```

## Routes

- `/` -> Marketplace
- `/marketplace` -> Marketplace
- `/studio` -> Mint and list NFTs
- `/collection` -> Wallet collection view

## Vercel Deployment

When deploying this frontend from the monorepo in Vercel:

1. Select this repository.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Configure all `VITE_*` environment variables in Vercel project settings.
