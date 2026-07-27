#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const CALLER_KEY: Symbol = symbol_short!("CALLER");

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Reputation(Address),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Reputation {
    pub total_score: u32,
    pub rating_count: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ReputationError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidScore = 4,
}

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    /// Initialize the contract with admin and authorized caller address (typically the Escrow Contract).
    pub fn initialize(
        env: Env,
        admin: Address,
        authorized_caller: Address,
    ) -> Result<(), ReputationError> {
        if env.storage().instance().has(&ADMIN_KEY) {
            return Err(ReputationError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&CALLER_KEY, &authorized_caller);
        
        // Extend instance storage TTL
        env.storage().instance().extend_ttl(1000, 5000);
        
        Ok(())
    }

    /// Add a rating (0 to 5) for a freelancer. Only callable by the authorized caller (Escrow Contract).
    pub fn add_rating(
        env: Env,
        freelancer: Address,
        score: u32,
    ) -> Result<Reputation, ReputationError> {
        let authorized_caller: Address = env
            .storage()
            .instance()
            .get(&CALLER_KEY)
            .ok_or(ReputationError::NotInitialized)?;

        // Ensure the caller is the authorized escrow contract (requires cross-contract auth)
        authorized_caller.require_auth();

        if score > 5 {
            return Err(ReputationError::InvalidScore);
        }

        // Extend instance TTL on writes
        env.storage().instance().extend_ttl(1000, 5000);

        let key = DataKey::Reputation(freelancer.clone());
        let mut rep = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Reputation {
                total_score: 0,
                rating_count: 0,
            });

        rep.total_score += score;
        rep.rating_count += 1;

        env.storage().persistent().set(&key, &rep);
        
        // Extend persistent storage TTL
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        // Emit rating_submitted event
        env.events().publish(
            (symbol_short!("rating"), freelancer),
            (score, rep.total_score, rep.rating_count),
        );

        Ok(rep)
    }

    /// Get current reputation for a freelancer.
    pub fn get_reputation(env: Env, freelancer: Address) -> Reputation {
        // Extend instance TTL on reads
        env.storage().instance().extend_ttl(1000, 5000);

        let key = DataKey::Reputation(freelancer);
        if let Some(rep) = env.storage().persistent().get::<DataKey, Reputation>(&key) {
            // Extend persistent storage TTL
            env.storage().persistent().extend_ttl(&key, 1000, 5000);
            rep
        } else {
            Reputation {
                total_score: 0,
                rating_count: 0,
            }
        }
    }
}

mod test;
