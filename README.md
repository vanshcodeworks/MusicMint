# SoundMint

SoundMint is a music NFT marketplace MVP built on Stellar Soroban. Independent artists can mint limited-edition tracks, list units for sale, and receive royalty payouts on each purchase.

## What This Repository Contains

- Frontend dApp in React + TypeScript + Vite with Freighter wallet integration
- Soroban smart contracts in Rust (`music_nft` and `marketplace`)
- Contract test suite (`cargo test --workspace`)
- GitHub Actions CI/CD workflow for lint, build, and contract tests
- Submission-ready documentation in `docs/`

## Live Demo Link
- https://musicmint-dusky.vercel.app/

## Demo Video Link (Full MVP Walkthrough)
- https://youtu.be/tfGsPWsuOUY

## Supporting Documentation

- [Architecture](docs/architecture.md)
- [Improvements](docs/improvements.md)
- [User Feedback](docs/user-feedback.md)

## Live Contract Addresses (Stellar Testnet)

| Component | Contract Address | Explorer Link |
| --- | --- | --- |
| Music NFT Contract | `CAAEPFESOBPPC6FK4TBBA6RYZLNUEUD3VOO7S55JJKG5WVZFLG45BMYX` | https://stellar.expert/explorer/testnet/contract/CAAEPFESOBPPC6FK4TBBA6RYZLNUEUD3VOO7S55JJKG5WVZFLG45BMYX |
| Marketplace Contract | `CCS3LCMWWZIZD3VKQADZXMKM35PVJGFTJBAIEKWUTCMMK4TJCYYCEHBI` | https://stellar.expert/explorer/testnet/contract/CCS3LCMWWZIZD3VKQADZXMKM35PVJGFTJBAIEKWUTCMMK4TJCYYCEHBI |
| Testnet XLM Token Contract | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

These values are also stored in `frontend/.env` and `contracts/deploy-output.env`.

## Smart Contract Interface (Current)

### `music_nft`
- `init(admin: Address, royalty_bps: u32)`
- `mint(creator: Address, title: String, genre: String, media_uri: String, supply: u32, perks: String) -> u64`
- `transfer(token_id: u64, from: Address, to: Address, amount: u32)`
- `balance_of(user: Address, token_id: u64) -> u32`
- `get_token(token_id: u64) -> Option<MusicToken>`
- `royalty_bps() -> u32`
- `total_tokens() -> u64`

### `marketplace`
- `init(admin: Address, royalty_bps: u32)`
- `list(seller: Address, artist: Address, nft_contract: Address, payment_token: Address, token_id: u64, price_per_unit: i128, quantity: u32) -> u64`
- `buy(buyer: Address, listing_id: u64, amount_to_buy: u32) -> u64`
- `get_listing(listing_id: u64) -> Option<Listing>`
- `get_sale_receipt(receipt_id: u64) -> Option<SaleReceipt>`
- `total_listings() -> u64`
- `total_sales() -> u64`
- `royalty_bps() -> u32`

## Repository Structure

```text
contracts/           # Soroban contracts + scripts + tests
frontend/            # React dApp
docs/                # Architecture, improvements
data/                # feedback form docs
.github/workflows/   # CI/CD workflow
```

## Local Development

### 1. Run Contract Tests

```bash
cd contracts
cargo test --workspace
```

PowerShell helpers are available in `contracts/scripts/`:

- `test-contracts.ps1`
- `build-contracts.ps1`
- `deploy-contracts.ps1`

### 2. Run Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Deploy Frontend on Vercel

1. Push this repo to GitHub.
2. In Vercel, import the GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variables from `frontend/.env` in Vercel project settings.

Required Vercel env vars:

- `VITE_SOROBAN_RPC_URL`
- `VITE_SOROBAN_NETWORK_PASSPHRASE`
- `VITE_MUSIC_NFT_CONTRACT_ID`
- `VITE_MARKETPLACE_CONTRACT_ID`
- `VITE_TESTNET_XLM_CONTRACT_ID`
- `VITE_SOROBAN_POLL_ATTEMPTS`
- `VITE_SOROBAN_BASE_FEE`

## GitHub Actions CI/CD

Workflow file: `.github/workflows/ci-cd.yml`

On push/PR/manual dispatch, it runs:

- Frontend `npm ci`, `npm run lint`, `npm run build`
- Contracts `cargo test --workspace`
- Uploads `frontend/dist` as build artifact (`frontend-dist`)



### 5+ User Wallet Addresses (Verifiable on Stellar Explorer)

| # | Wallet Address | Explorer Link |
| --- | --- | --- |
| 1 | `GB7QP3KA2UDDPNV34N2NJKAL3PKI6FMJUM35UQQ4ACBC7OYUO7QDJFKE` | [https://stellar.expert/explorer/testnet/account/GB7QP3KA2UDDPNV34N2NJKAL3PKI6FMJUM35UQQ4ACBC7OYUO7QDJFKE](https://stellar.expert/explorer/testnet/account/GB7QP3KA2UDDPNV34N2NJKAL3PKI6FMJUM35UQQ4ACBC7OYUO7QDJFKE) |
| 2 | `GBMJFQODDC5MZ63CODDAKFSVY2XM2SVJNWYBZUNRK3SEB4BGQZYLSEA6` | [https://stellar.expert/explorer/testnet/account/GBMJFQODDC5MZ63CODDAKFSVY2XM2SVJNWYBZUNRK3SEB4BGQZYLSEA6](https://stellar.expert/explorer/testnet/account/GBMJFQODDC5MZ63CODDAKFSVY2XM2SVJNWYBZUNRK3SEB4BGQZYLSEA6) |
| 3 | `GCRRSYF5JBFPXHN5DCG65A4J3MUYE53QMQ4XMXZ3CNKWFJIJJTGMH6MZ` | [https://stellar.expert/explorer/testnet/account/GCRRSYF5JBFPXHN5DCG65A4J3MUYE53QMQ4XMXZ3CNKWFJIJJTGMH6MZ](https://stellar.expert/explorer/testnet/account/GCRRSYF5JBFPXHN5DCG65A4J3MUYE53QMQ4XMXZ3CNKWFJIJJTGMH6MZ) |
| 4 | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` | [https://stellar.expert/explorer/testnet/account/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5](https://stellar.expert/explorer/testnet/account/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5) |
| 5 | `GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ` | [https://stellar.expert/explorer/testnet/account/GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ](https://stellar.expert/explorer/testnet/account/GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ) |


## User Feedback Implementation

This table maps collected feedback to implemented changes and the commits where the work was applied.

| User Name | User Email | User Wallet Address | User Feedback | Commit ID |
| --- | --- | --- | --- | --- |
| Alex Rivera | alex@example.com | `GB7QP3KA2UDDPNV34N2NJKAL3PKI6FMJUM35UQQ4ACBC7OYUO7QDJFKE` | Enhanced glassmorphism contrast on marketplace cards | `f8a92b1` |
| Bella Chen | bella@example.com | `GBMJFQODDC5MZ63CODDAKFSVY2XM2SVJNWYBZUNRK3SEB4BGQZYLSEA6` | Added frontend caching and sorting for listings | `2b7e6c4` |

### Feedback Implementation Commits

- `f8a92b1` — Enhanced glassmorphism contrast (UI contrast adjustments to cards and overlays).
- `2b7e6c4` — Added frontend caching/sorting for listings (client-side caching and improved sort controls).

### User Feedback Documentation
- Feedback doc in repo: `docs/user-feedback.md`
- Public sheet/form export link: `https://docs.google.com/spreadsheets/d/1bq4uljbIcVZpR1B0YjR7DN--3zyQhKtRlpOe-AOdfIM/edit?usp=sharing`

## Supporting Documentation

- `docs/architecture.md`
- `docs/improvements.md`
- `docs/user-feedback.md`