#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    IntoVal, String, Symbol, Val,
};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const REP_KEY: Symbol = symbol_short!("REP");
const NEXT_ID_KEY: Symbol = symbol_short!("NEXTID");

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum Status {
    Created,
    Funded,
    Completed,
    Refunded,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Job(u64),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Job {
    pub client: Address,
    pub freelancer: Address,
    pub token: Address,
    pub amount: i128,
    pub description: String,
    pub deadline: u64, // Unix timestamp in seconds
    pub status: Status,
    pub rated: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotFound = 3,
    InvalidStatus = 4,
    Unauthorized = 5,
    DeadlineNotPassed = 6,
    AlreadyRated = 7,
    InvalidAmount = 8,
    InvalidScore = 9,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize the Escrow contract with an admin and the reputation contract address.
    pub fn initialize(
        env: Env,
        admin: Address,
        reputation_contract: Address,
    ) -> Result<(), EscrowError> {
        if env.storage().instance().has(&ADMIN_KEY) {
            return Err(EscrowError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&REP_KEY, &reputation_contract);
        env.storage().instance().set(&NEXT_ID_KEY, &0u64);

        env.storage().instance().extend_ttl(1000, 5000);
        Ok(())
    }

    /// Create a job listing. Status starts as `Created`. Only client can create.
    pub fn create_job(
        env: Env,
        client: Address,
        freelancer: Address,
        token: Address,
        amount: i128,
        description: String,
        deadline: u64,
    ) -> Result<u64, EscrowError> {
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }
        client.require_auth();

        env.storage().instance().extend_ttl(1000, 5000);

        let id: u64 = env.storage().instance().get(&NEXT_ID_KEY).unwrap_or(0);
        let job = Job {
            client: client.clone(),
            freelancer: freelancer.clone(),
            token,
            amount,
            description,
            deadline,
            status: Status::Created,
            rated: false,
        };

        let key = DataKey::Job(id);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        env.storage().instance().set(&NEXT_ID_KEY, &(id + 1));

        // Emit job_created event
        env.events().publish(
            (symbol_short!("created"), id),
            (client, freelancer, amount),
        );

        Ok(id)
    }

    /// Client deposits the funds to secure/activate the job. Status transitions to `Funded`.
    pub fn fund_job(env: Env, job_id: u64) -> Result<(), EscrowError> {
        let mut job = Self::get_job(env.clone(), job_id)?;
        if job.status != Status::Created {
            return Err(EscrowError::InvalidStatus);
        }
        job.client.require_auth();

        env.storage().instance().extend_ttl(1000, 5000);

        // Transfer funds from client to the escrow contract
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&job.client, &env.current_contract_address(), &job.amount);

        job.status = Status::Funded;
        
        let key = DataKey::Job(job_id);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        // Emit job_funded event
        env.events().publish(
            (symbol_short!("funded"), job_id),
            (job.client, job.amount),
        );

        Ok(())
    }

    /// Client marks the job complete, releasing funds to the freelancer. Status transitions to `Completed`.
    pub fn complete_job(env: Env, job_id: u64) -> Result<(), EscrowError> {
        let mut job = Self::get_job(env.clone(), job_id)?;
        if job.status != Status::Funded {
            return Err(EscrowError::InvalidStatus);
        }
        job.client.require_auth();

        env.storage().instance().extend_ttl(1000, 5000);

        // Transfer funds from contract to freelancer
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&env.current_contract_address(), &job.freelancer, &job.amount);

        job.status = Status::Completed;
        
        let key = DataKey::Job(job_id);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        // Emit job_completed event
        env.events().publish(
            (symbol_short!("completed"), job_id),
            job.freelancer.clone(),
        );

        Ok(())
    }

    /// Client or Freelancer requests refund if the deadline passes without completion. Status transitions to `Refunded`.
    pub fn refund_job(env: Env, job_id: u64) -> Result<(), EscrowError> {
        let mut job = Self::get_job(env.clone(), job_id)?;
        if job.status != Status::Funded {
            return Err(EscrowError::InvalidStatus);
        }

        // Verify current timestamp is past the deadline
        if env.ledger().timestamp() < job.deadline {
            return Err(EscrowError::DeadlineNotPassed);
        }

        env.storage().instance().extend_ttl(1000, 5000);

        // Transfer funds back to client
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(&env.current_contract_address(), &job.client, &job.amount);

        job.status = Status::Refunded;
        
        let key = DataKey::Job(job_id);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        // Emit job_refunded event
        env.events().publish(
            (symbol_short!("refunded"), job_id),
            job.client.clone(),
        );

        Ok(())
    }

    /// Client submits a rating (0 to 5) for a completed job, updating the freelancer's score via cross-contract call.
    pub fn submit_rating(env: Env, job_id: u64, score: u32) -> Result<(), EscrowError> {
        let mut job = Self::get_job(env.clone(), job_id)?;
        if job.status != Status::Completed {
            return Err(EscrowError::InvalidStatus);
        }
        if job.rated {
            return Err(EscrowError::AlreadyRated);
        }
        if score > 5 {
            return Err(EscrowError::InvalidScore);
        }
        job.client.require_auth();

        env.storage().instance().extend_ttl(1000, 5000);

        let reputation_contract: Address = env
            .storage()
            .instance()
            .get(&REP_KEY)
            .ok_or(EscrowError::NotInitialized)?;

        // Perform the real cross-contract call to the Reputation contract
        let _: Val = env.invoke_contract(
            &reputation_contract,
            &Symbol::new(&env, "add_rating"),
            (job.freelancer.clone(), score).into_val(&env),
        );

        job.rated = true;
        let key = DataKey::Job(job_id);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        // Emit rating_submitted event
        env.events().publish(
            (symbol_short!("rated"), job_id),
            (job.freelancer.clone(), score),
        );

        Ok(())
    }

    /// Retrieve a job's details and extend its TTL.
    pub fn get_job(env: Env, job_id: u64) -> Result<Job, EscrowError> {
        let key = DataKey::Job(job_id);
        let job: Job = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)?;
            
        env.storage().persistent().extend_ttl(&key, 1000, 5000);
        Ok(job)
    }
}

mod test;
