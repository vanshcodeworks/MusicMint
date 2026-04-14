# SoundMint Architecture

## System Overview

SoundMint is a frontend-first dApp that talks directly to Soroban contracts. There is no backend API dependency for mint/list/buy flows.

graph TD
    %% Styling
    classDef frontend fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef wallet fill:#1e1e2f,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef rpc fill:#1e293b,stroke:#06b6d4,stroke-width:2px,color:#fff
    classDef blockchain fill:#171717,stroke:#10b981,stroke-width:2px,color:#fff
    classDef contract fill:#064e3b,stroke:#34d399,stroke-width:1px,color:#fff

    %% Components
    User((User / Artist)) 
    
    subgraph Client Layer
        UI[React Frontend<br/>Vite + TypeScript]:::frontend
        FW[Freighter Wallet<br/>Browser Extension]:::wallet
    end

    subgraph Network Layer
        RPC[Soroban RPC<br/>Testnet Node]:::rpc
    end

    subgraph Stellar Soroban Testnet
        Ledger[(Stellar Ledger)]:::blockchain
        C_Music[music_nft<br/>Smart Contract]:::contract
        C_Market[marketplace<br/>Smart Contract]:::contract
        C_Token[Testnet XLM<br/>Payment Contract]:::contract
    end

    %% Flows
    User -->|Interacts| UI
    UI <-->|Requests Signature| FW
    
    UI -->|Read: simulateTransaction| RPC
    UI -->|Write: sendTransaction| RPC
    RPC -.->|Poll for SUCCESS| UI

    RPC <-->|Executes XDR| Ledger
    
    Ledger --- C_Music
    Ledger --- C_Market
    Ledger --- C_Token

    %% Contract Interactions
    C_Market -->|Cross-Contract Call:<br/>transfer NFT| C_Music
    C_Market -->|Cross-Contract Call:<br/>transfer XLM splits| C_Token

    
## Core Contracts

### `music_nft`

Purpose:
- Mint music NFTs with fixed supply.
- Track balances per `(user, token_id)`.
- Support quantity-based transfer.

Key methods:
- `mint(creator, title, genre, media_uri, supply, perks)`
- `transfer(token_id, from, to, amount)`
- `balance_of(user, token_id)`
- `get_token(token_id)`

`MusicToken` struct fields:
- `id`
- `creator`
- `title`
- `genre`
- `media_uri`
- `perks`
- `supply`
- `created_at`

### `marketplace`

Purpose:
- List NFTs for sale with quantity and per-unit pricing.
- Execute purchases with royalty split.
- Store immutable sale receipts.

Key methods:
- `list(seller, artist, nft_contract, payment_token, token_id, price_per_unit, quantity)`
- `buy(buyer, listing_id, amount_to_buy)`
- `get_listing(listing_id)`
- `get_sale_receipt(receipt_id)`
- `total_listings()`
- `total_sales()`

`Listing` struct fields:
- `id`
- `token_id`
- `nft_contract`
- `seller`
- `artist`
- `payment_token`
- `price_per_unit`
- `quantity`
- `active`
- `created_at`

`SaleReceipt` struct fields:
- `id`
- `listing_id`
- `token_id`
- `seller`
- `buyer`
- `amount_bought`
- `total_price`
- `sold_at`

## Frontend Data Flow

### Read Path

1. Frontend simulates contract calls through Soroban RPC.
2. Returned `ScVal` values are converted to native objects.
3. Frontend parser normalizes field names and option-like wrappers.
4. UI state is built into dashboard sections:
   - NFTs
   - Listings
   - Sales

### Write Path

1. User clicks an action (mint/list/buy).
2. Frontend builds Soroban transaction.
3. Freighter signs transaction.
4. Frontend submits signed transaction via RPC.
5. Frontend polls transaction status until `SUCCESS`.
6. Frontend resolves contract return value and refreshes dashboard.

## Wallet and Network Behavior

- Freighter connection state is persisted locally for smoother reload behavior.
- UI enforces Testnet usage (`Test SDF Network ; September 2015`).
- Transaction hashes are cached in local storage for quick proof links.

## Testing Strategy

- Rust contract tests validate mint/transfer/list/buy/royalty behaviors.
- Frontend CI validates lint/build integrity.
- GitHub Actions runs both layers on push/PR.

## Deployment Model

- Contracts deployed to Stellar Soroban Testnet.
- Frontend deployed to Vercel from `frontend/` root.
- Runtime configuration provided via Vercel environment variables.
