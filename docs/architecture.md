# SoundMint Architecture

## System Overview

SoundMint is a **frontend-first decentralized application (dApp)** built on Stellar Soroban.  
It enables independent artists to mint, list, and sell music NFTs with built-in royalty distribution.

The system operates **without a centralized backend**, relying entirely on:
- Soroban smart contracts
- Freighter wallet for signing
- Soroban RPC for communication

---

## High-Level Architecture

```mermaid
graph TD
    User((User / Artist))

    subgraph Client Layer
        UI[React Frontend<br/>Vite + TypeScript]
        FW[Freighter Wallet<br/>Browser Extension]
    end

    subgraph Network Layer
        RPC[Soroban RPC<br/>Testnet Node]
    end

    subgraph Stellar Soroban Testnet
        Ledger[(Stellar Ledger)]
        C_Music[music_nft Contract]
        C_Market[marketplace Contract]
        C_Token[Testnet XLM Contract]
    end

    User -->|Interacts| UI
    UI <-->|Signature Requests| FW

    UI -->|Simulate / Send Tx| RPC
    RPC -->|Execute| Ledger

    Ledger --- C_Music
    Ledger --- C_Market
    Ledger --- C_Token

    C_Market -->|NFT Transfer| C_Music
    C_Market -->|Payment + Royalty Split| C_Token
````

---

## Why No Backend?

SoundMint follows a **fully decentralized architecture**:

* All application state lives **on-chain**
* Frontend directly interacts with contracts via RPC
* No centralized server or API layer

### Benefits:

* Trustless execution
* Transparent transactions
* Lower infrastructure cost
* Simplified deployment

---

## Core Smart Contracts

### `music_nft`

**Purpose:**

* Mint music NFTs with fixed supply
* Track balances per user
* Enable quantity-based transfers

**Key Methods:**

* `mint(creator, title, genre, media_uri, supply, perks)`
* `transfer(token_id, from, to, amount)`
* `balance_of(user, token_id)`
* `get_token(token_id)`

**MusicToken Structure:**

* `id`
* `creator`
* `title`
* `genre`
* `media_uri`
* `perks`
* `supply`
* `created_at`

---

### `marketplace`

**Purpose:**

* List NFTs for sale
* Handle purchases
* Distribute royalties
* Store immutable sale receipts

**Key Methods:**

* `list(seller, artist, nft_contract, payment_token, token_id, price_per_unit, quantity)`
* `buy(buyer, listing_id, amount_to_buy)`
* `get_listing(listing_id)`
* `get_sale_receipt(receipt_id)`
* `total_listings()`
* `total_sales()`

---

## Cross-Contract Interaction

The `marketplace` contract orchestrates the full purchase flow:

1. Transfers NFT units via `music_nft`
2. Transfers payment via token contract
3. Splits payment into:

   * Seller share
   * Artist royalty

This ensures **atomic execution** of trade + royalty.

---

## Frontend Data Flow

### Read Flow

1. Frontend simulates contract calls via Soroban RPC
2. Receives `ScVal` responses
3. Converts them into native objects
4. Normalizes structure for UI rendering

Displayed in:

* NFT dashboard
* Listings
* Sales history

---

### Write Flow

1. User triggers action (mint/list/buy)
2. Frontend constructs transaction
3. Freighter signs transaction
4. Transaction sent via RPC
5. Frontend polls until status = `SUCCESS`
6. UI refreshes with updated state

---

## Wallet & Network Handling

* Freighter wallet manages authentication and signing
* Connection state is cached locally
* App enforces **Stellar Testnet usage**
* Transaction hashes stored for verification links

---

## Security Considerations

* All transactions require wallet signatures
* No private keys stored in frontend
* Smart contracts enforce:

  * Ownership validation
  * Supply limits
  * Royalty distribution
* Frontend performs basic input validation

---

## Testing Strategy

* Rust unit tests for:

  * Minting
  * Transfers
  * Listings
  * Purchases
  * Royalty logic

* CI/CD pipeline ensures:

  * Frontend build integrity
  * Contract test execution

---

## Deployment Model

* Smart contracts deployed on **Stellar Soroban Testnet**
* Frontend hosted on **Vercel**
* Environment variables configure:

  * RPC endpoint
  * Contract addresses
  * Network settings

---

## Scalability Considerations

* Stateless frontend enables easy scaling via CDN
* Blockchain handles consistency and state
* Future improvements:

  * Indexing layer for faster reads
  * Metadata caching
  * Multi-token support

---

## Summary

SoundMint demonstrates a **pure Web3 architecture** where:

* Logic lives in smart contracts
* UI acts as a thin interaction layer
* Users retain full control via wallets

This design ensures **transparency, decentralization, and composability**.

