#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const NEXT_ID: Symbol = symbol_short!("NEXT_ID");
const ROYALTY: Symbol = symbol_short!("ROYALTY");

#[contracttype]
#[derive(Clone)]
pub struct MusicToken {
    pub id: u64,
    pub creator: Address,
    pub title: String,
    pub genre: String,
    pub media_uri: String,
    pub perks: String,
    pub supply: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token(u64),
    Balance(Address, u64), 
}

#[contract]
pub struct MusicNftContract;

#[contractimpl]
impl MusicNftContract {
    pub fn init(env: Env, admin: Address, royalty_bps: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("contract already initialized");
        }

        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&NEXT_ID, &1_u64);
        env.storage().instance().set(&ROYALTY, &royalty_bps);
    }

    pub fn mint(
        env: Env,
        creator: Address,
        title: String,
        genre: String,
        media_uri: String,
        supply: u32,
        perks: String,
    ) -> u64 {
        creator.require_auth();

        let next_id = env
            .storage()
            .instance()
            .get::<Symbol, u64>(&NEXT_ID)
            .unwrap_or(1_u64);

        let token = MusicToken {
            id: next_id,
            creator: creator.clone(),
            title,
            genre,
            media_uri,
            perks,
            supply,
            created_at: env.ledger().timestamp(),
        };

        // Save the token data
        env.storage().persistent().set(&DataKey::Token(next_id), &token);
        
        // ✅ NEW: Mint the entire supply to the creator's balance ledger
        env.storage().persistent().set(&DataKey::Balance(creator, next_id), &supply);
        
        env.storage().instance().set(&NEXT_ID, &(next_id + 1));

        next_id
    }

    // ✅ NEW: Transfer now takes an `amount` parameter
    pub fn transfer(env: Env, token_id: u64, from: Address, to: Address, amount: u32) {
        from.require_auth();

        if amount == 0 {
            panic!("amount must be greater than zero");
        }

        let from_balance = Self::balance_of(env.clone(), from.clone(), token_id);
        if from_balance < amount {
            panic!("insufficient balance to transfer");
        }

        let to_balance = Self::balance_of(env.clone(), to.clone(), token_id);

        // Deduct from sender, add to receiver
        env.storage().persistent().set(&DataKey::Balance(from, token_id), &(from_balance - amount));
        env.storage().persistent().set(&DataKey::Balance(to, token_id), &(to_balance + amount));
    }

    // ✅ NEW: Check how many units a specific user owns
    pub fn balance_of(env: Env, user: Address, token_id: u64) -> u32 {
        env.storage()
            .persistent()
            .get::<DataKey, u32>(&DataKey::Balance(user, token_id))
            .unwrap_or(0)
    }

    pub fn get_token(env: Env, token_id: u64) -> Option<MusicToken> {
        env.storage().persistent().get::<DataKey, MusicToken>(&DataKey::Token(token_id))
    }

    pub fn royalty_bps(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<Symbol, u32>(&ROYALTY)
            .unwrap_or(1000)
    }

    pub fn total_tokens(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<Symbol, u64>(&NEXT_ID)
            .unwrap_or(1_u64)
            .saturating_sub(1_u64)
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn mint_transfer_and_balance_workflow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, MusicNftContract);
        let client = MusicNftContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let collector = Address::generate(&env);

        client.init(&admin, &1200);

        let token_id = client.mint(
            &creator,
            &String::from_str(&env, "Night Echoes"),
            &String::from_str(&env, "ambient"),
            &String::from_str(&env, "https://example.com/night-echoes"),
            &50,
            &String::from_str(&env, "private stems pack"),
        );

        assert_eq!(token_id, 1);
        assert_eq!(client.total_tokens(), 1);
        assert_eq!(client.royalty_bps(), 1200);

        let token = client.get_token(&token_id).unwrap();
        assert_eq!(token.id, 1);
        assert_eq!(token.creator, creator);
        assert_eq!(token.supply, 50);

        assert_eq!(client.balance_of(&creator, &token_id), 50);
        assert_eq!(client.balance_of(&collector, &token_id), 0);

        client.transfer(&token_id, &creator, &collector, &10);

        assert_eq!(client.balance_of(&creator, &token_id), 40);
        assert_eq!(client.balance_of(&collector, &token_id), 10);
    }

    #[test]
    #[should_panic(expected = "amount must be greater than zero")]
    fn transfer_rejects_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, MusicNftContract);
        let client = MusicNftContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let collector = Address::generate(&env);

        client.init(&admin, &1000);

        let token_id = client.mint(
            &creator,
            &String::from_str(&env, "Zero Test"),
            &String::from_str(&env, "test"),
            &String::from_str(&env, "https://example.com/zero"),
            &1,
            &String::from_str(&env, "none"),
        );

        client.transfer(&token_id, &creator, &collector, &0);
    }
}