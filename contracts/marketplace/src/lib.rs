#![no_std]

use soroban_sdk::{
    contractclient, contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, token
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const NEXT_LISTING_ID: Symbol = symbol_short!("NEXTLID");
const NEXT_SALE_ID: Symbol = symbol_short!("NEXT_SALE");
const ROYALTY: Symbol = symbol_short!("ROYALTY");

// ✅ NEW: Trait updated to include the `amount` parameter
#[contractclient(name = "MusicNftClient")]
pub trait MusicNftTrait {
    fn transfer(env: Env, token_id: u64, from: Address, to: Address, amount: u32);
}

#[contracttype]
#[derive(Clone)]
pub struct Listing {
    pub id: u64,
    pub token_id: u64,
    pub nft_contract: Address,
    pub seller: Address,
    pub artist: Address,
    pub payment_token: Address,
    pub price_per_unit: i128,  // ✅ Changed from 'price' to 'price_per_unit'
    pub quantity: u32,         // ✅ NEW: Track how many are currently for sale
    pub active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct SaleReceipt {
    pub id: u64,
    pub listing_id: u64,
    pub token_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub amount_bought: u32,    // ✅ NEW: Track how many were bought in this transaction
    pub total_price: i128,
    pub sold_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Listing(u64),
    Sale(u64),
}

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    pub fn init(env: Env, admin: Address, royalty_bps: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("contract already initialized");
        }

        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&NEXT_LISTING_ID, &1_u64);
        env.storage().instance().set(&NEXT_SALE_ID, &1_u64);
        env.storage().instance().set(&ROYALTY, &royalty_bps);
    }

    pub fn list(
        env: Env,
        seller: Address,
        artist: Address,
        nft_contract: Address,
        payment_token: Address,
        token_id: u64,
        price_per_unit: i128,
        quantity: u32,           // ✅ NEW: Specify how many to list
    ) -> u64 {
        seller.require_auth();

        if price_per_unit <= 0 {
            panic!("price must be greater than zero");
        }
        if quantity == 0 {
            panic!("quantity must be greater than zero");
        }

        // Pull the requested quantity of NFTs into Escrow
        let nft_client = MusicNftClient::new(&env, &nft_contract);
        nft_client.transfer(&token_id, &seller, &env.current_contract_address(), &quantity);

        let listing_id = env.storage().instance().get::<Symbol, u64>(&NEXT_LISTING_ID).unwrap_or(1_u64);

        let listing = Listing {
            id: listing_id,
            token_id,
            nft_contract,
            seller,
            artist,
            payment_token,
            price_per_unit,
            quantity,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
        env.storage().instance().set(&NEXT_LISTING_ID, &(listing_id + 1));

        listing_id
    }

    // ✅ NEW: Buyer now specifies how many they want to buy
    pub fn buy(env: Env, buyer: Address, listing_id: u64, amount_to_buy: u32) -> u64 {
        buyer.require_auth();

        if amount_to_buy == 0 {
            panic!("must buy at least one unit");
        }

        let mut listing = env
            .storage()
            .persistent()
            .get::<DataKey, Listing>(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing not found"));

        if !listing.active {
            panic!("listing is sold out or inactive");
        }
        if listing.seller == buyer {
            panic!("seller cannot buy own listing");
        }
        if listing.quantity < amount_to_buy {
            panic!("not enough units available in this listing");
        }

        // Calculate total cost based on amount bought
        let total_price = listing.price_per_unit * (amount_to_buy as i128);

        let royalty_bps = env.storage().instance().get::<Symbol, u32>(&ROYALTY).unwrap_or(1000);
        let royalty_amount = total_price * (royalty_bps as i128) / 10_000;
        let seller_amount = total_price - royalty_amount;

        // Move the Money
        let token_client = token::Client::new(&env, &listing.payment_token);
        if royalty_amount > 0 {
            token_client.transfer(&buyer, &listing.artist, &royalty_amount);
        }
        if seller_amount > 0 {
            token_client.transfer(&buyer, &listing.seller, &seller_amount);
        }

        // Send the NFT units from escrow to the buyer
        let nft_client = MusicNftClient::new(&env, &listing.nft_contract);
        nft_client.transfer(&listing.token_id, &env.current_contract_address(), &buyer, &amount_to_buy);

        // ✅ NEW: Update listing inventory
        listing.quantity -= amount_to_buy;
        if listing.quantity == 0 {
            listing.active = false; // Mark as sold out
        }
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);

        // Generate a unique Sale Receipt
        let receipt_id = env.storage().instance().get::<Symbol, u64>(&NEXT_SALE_ID).unwrap_or(1_u64);
        let receipt = SaleReceipt {
            id: receipt_id,
            listing_id,
            token_id: listing.token_id,
            seller: listing.seller.clone(),
            buyer: buyer.clone(),
            amount_bought: amount_to_buy,
            total_price,
            sold_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Sale(receipt_id), &receipt);
        env.storage().instance().set(&NEXT_SALE_ID, &(receipt_id + 1));

        receipt_id // Return the unique receipt ID
    }

    pub fn get_listing(env: Env, listing_id: u64) -> Option<Listing> {
        env.storage().persistent().get::<DataKey, Listing>(&DataKey::Listing(listing_id))
    }

    pub fn get_sale_receipt(env: Env, receipt_id: u64) -> Option<SaleReceipt> {
        env.storage().persistent().get::<DataKey, SaleReceipt>(&DataKey::Sale(receipt_id))
    }
    pub fn total_listings(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<Symbol, u64>(&NEXT_LISTING_ID)
            .unwrap_or(1_u64)
            .saturating_sub(1_u64)
    }

    pub fn total_sales(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<Symbol, u64>(&NEXT_SALE_ID)
            .unwrap_or(1_u64)
            .saturating_sub(1_u64)
    }

    pub fn royalty_bps(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<Symbol, u32>(&ROYALTY)
            .unwrap_or(1000_u32)
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    mod mock_nft {
        use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

        #[contracttype]
        #[derive(Clone)]
        enum DataKey {
            Balance(Address, u64),
        }

        #[contract]
        pub struct Contract;

        #[contractimpl]
        impl Contract {
            pub fn set_balance(env: Env, owner: Address, token_id: u64, amount: u32) {
                env.storage()
                    .persistent()
                    .set(&DataKey::Balance(owner, token_id), &amount);
            }

            pub fn balance_of(env: Env, owner: Address, token_id: u64) -> u32 {
                env.storage()
                    .persistent()
                    .get::<DataKey, u32>(&DataKey::Balance(owner, token_id))
                    .unwrap_or(0)
            }

            pub fn transfer(env: Env, token_id: u64, from: Address, to: Address, amount: u32) {
                from.require_auth();

                if amount == 0 {
                    panic!("amount must be greater than zero");
                }

                let from_balance = Self::balance_of(env.clone(), from.clone(), token_id);
                if from_balance < amount {
                    panic!("insufficient balance");
                }

                let to_balance = Self::balance_of(env.clone(), to.clone(), token_id);

                env.storage().persistent().set(
                    &DataKey::Balance(from, token_id),
                    &(from_balance - amount),
                );
                env.storage()
                    .persistent()
                    .set(&DataKey::Balance(to, token_id), &(to_balance + amount));
            }
        }
    }

    mod mock_token {
        use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

        #[contracttype]
        #[derive(Clone)]
        enum DataKey {
            Balance(Address),
        }

        #[contract]
        pub struct Contract;

        #[contractimpl]
        impl Contract {
            pub fn mint(env: Env, to: Address, amount: i128) {
                if amount < 0 {
                    panic!("mint amount must be non-negative");
                }

                let current = Self::balance(env.clone(), to.clone());
                env.storage()
                    .persistent()
                    .set(&DataKey::Balance(to), &(current + amount));
            }

            pub fn balance(env: Env, owner: Address) -> i128 {
                env.storage()
                    .persistent()
                    .get::<DataKey, i128>(&DataKey::Balance(owner))
                    .unwrap_or(0)
            }

            pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
                from.require_auth();

                if amount <= 0 {
                    panic!("transfer amount must be positive");
                }

                let from_balance = Self::balance(env.clone(), from.clone());
                if from_balance < amount {
                    panic!("insufficient token balance");
                }

                let to_balance = Self::balance(env.clone(), to.clone());

                env.storage()
                    .persistent()
                    .set(&DataKey::Balance(from), &(from_balance - amount));
                env.storage()
                    .persistent()
                    .set(&DataKey::Balance(to), &(to_balance + amount));
            }
        }
    }

    #[test]
    fn list_buy_and_royalty_distribution_workflow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let seller = Address::generate(&env);
        let artist = Address::generate(&env);
        let buyer = Address::generate(&env);

        let marketplace_contract_id = env.register_contract(None, MarketplaceContract);
        let marketplace = MarketplaceContractClient::new(&env, &marketplace_contract_id);

        let nft_contract_id = env.register_contract(None, mock_nft::Contract);
        let nft = mock_nft::ContractClient::new(&env, &nft_contract_id);

        let payment_token_contract_id = env.register_contract(None, mock_token::Contract);
        let payment_token = mock_token::ContractClient::new(&env, &payment_token_contract_id);

        let token_id = 7_u64;
        let seller_inventory = 8_u32;
        let list_quantity = 5_u32;
        let amount_to_buy = 2_u32;
        let price_per_unit = 2_500_0000_i128;
        let royalty_bps = 1000_u32;
        let buyer_start_balance = 100_000_0000_i128;

        nft.set_balance(&seller, &token_id, &seller_inventory);
        payment_token.mint(&buyer, &buyer_start_balance);

        marketplace.init(&admin, &royalty_bps);

        let listing_id = marketplace.list(
            &seller,
            &artist,
            &nft_contract_id,
            &payment_token_contract_id,
            &token_id,
            &price_per_unit,
            &list_quantity,
        );

        assert_eq!(listing_id, 1);
        assert_eq!(marketplace.total_listings(), 1);

        let listing = marketplace.get_listing(&listing_id).unwrap();
        assert_eq!(listing.id, listing_id);
        assert_eq!(listing.token_id, token_id);
        assert_eq!(listing.seller, seller);
        assert_eq!(listing.artist, artist);
        assert_eq!(listing.price_per_unit, price_per_unit);
        assert_eq!(listing.quantity, list_quantity);
        assert!(listing.active);

        assert_eq!(
            nft.balance_of(&seller, &token_id),
            seller_inventory - list_quantity
        );
        assert_eq!(nft.balance_of(&marketplace_contract_id, &token_id), list_quantity);

        let receipt_id = marketplace.buy(&buyer, &listing_id, &amount_to_buy);

        assert_eq!(receipt_id, 1);
        assert_eq!(marketplace.total_sales(), 1);

        let receipt = marketplace.get_sale_receipt(&receipt_id).unwrap();
        assert_eq!(receipt.id, receipt_id);
        assert_eq!(receipt.listing_id, listing_id);
        assert_eq!(receipt.token_id, token_id);
        assert_eq!(receipt.seller, seller);
        assert_eq!(receipt.buyer, buyer);
        assert_eq!(receipt.amount_bought, amount_to_buy);
        assert_eq!(receipt.total_price, price_per_unit * (amount_to_buy as i128));

        let updated_listing = marketplace.get_listing(&listing_id).unwrap();
        assert_eq!(updated_listing.quantity, list_quantity - amount_to_buy);
        assert!(updated_listing.active);

        let expected_total_price = price_per_unit * (amount_to_buy as i128);
        let expected_royalty = expected_total_price * (royalty_bps as i128) / 10_000;
        let expected_seller_amount = expected_total_price - expected_royalty;

        assert_eq!(
            payment_token.balance(&buyer),
            buyer_start_balance - expected_total_price
        );
        assert_eq!(payment_token.balance(&artist), expected_royalty);
        assert_eq!(payment_token.balance(&seller), expected_seller_amount);

        assert_eq!(nft.balance_of(&buyer, &token_id), amount_to_buy);
        assert_eq!(
            nft.balance_of(&marketplace_contract_id, &token_id),
            list_quantity - amount_to_buy
        );

        let second_buy_amount = list_quantity - amount_to_buy;
        let second_receipt_id = marketplace.buy(&buyer, &listing_id, &second_buy_amount);

        assert_eq!(second_receipt_id, 2);
        assert_eq!(marketplace.total_sales(), 2);

        let sold_out_listing = marketplace.get_listing(&listing_id).unwrap();
        assert_eq!(sold_out_listing.quantity, 0);
        assert!(!sold_out_listing.active);
    }

    #[test]
    #[should_panic(expected = "quantity must be greater than zero")]
    fn list_rejects_zero_quantity() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let seller = Address::generate(&env);
        let artist = Address::generate(&env);

        let marketplace_contract_id = env.register_contract(None, MarketplaceContract);
        let marketplace = MarketplaceContractClient::new(&env, &marketplace_contract_id);

        let nft_contract_id = env.register_contract(None, mock_nft::Contract);
        let payment_token_contract_id = env.register_contract(None, mock_token::Contract);

        marketplace.init(&admin, &1000);
        marketplace.list(
            &seller,
            &artist,
            &nft_contract_id,
            &payment_token_contract_id,
            &1_u64,
            &1_000_0000_i128,
            &0_u32,
        );
    }
}