#![cfg(test)]

use super::*;
use reputation_contract::{ReputationContract, ReputationContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{token, Env, String as SorobanString};

fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &contract_address.address()),
        token::StellarAssetClient::new(env, &contract_address.address()),
    )
}

struct TestCtx {
    env: Env,
    escrow: EscrowContractClient<'static>,
    reputation: ReputationContractClient<'static>,
    token: token::Client<'static>,
    client: Address,
    freelancer: Address,
    _admin: Address,
}

fn setup() -> TestCtx {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);

    let escrow_id = env.register_contract(None, EscrowContract);
    let escrow = EscrowContractClient::new(&env, &escrow_id);

    let reputation_id = env.register_contract(None, ReputationContract);
    let reputation = ReputationContractClient::new(&env, &reputation_id);

    reputation.initialize(&admin, &escrow_id);
    escrow.initialize(&admin, &reputation_id);

    let (token_client, token_admin_client) = create_token_contract(&env, &admin);
    token_admin_client.mint(&client_addr, &1_000_000);

    TestCtx {
        env,
        escrow,
        reputation,
        token: token_client,
        client: client_addr,
        freelancer: freelancer_addr,
        _admin: admin,
    }
}

#[test]
fn test_happy_path_workflow() {
    let ctx = setup();
    let deadline = 1000u64;

    // 1. Create Job (starts in Created status)
    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &500,
        &SorobanString::from_str(&ctx.env, "Freelance Website Development"),
        &deadline,
    );

    let job = ctx.escrow.get_job(&job_id);
    assert_eq!(job.status, Status::Created);
    assert_eq!(ctx.token.balance(&ctx.client), 1_000_000); // No transfer yet

    // 2. Fund Job (moves tokens to contract, transitions to Funded)
    ctx.escrow.fund_job(&job_id);
    let job_funded = ctx.escrow.get_job(&job_id);
    assert_eq!(job_funded.status, Status::Funded);
    assert_eq!(ctx.token.balance(&ctx.client), 999_500);
    assert_eq!(ctx.token.balance(&ctx.escrow.address), 500);

    // 3. Complete Job (releases funds to freelancer, transitions to Completed)
    ctx.escrow.complete_job(&job_id);
    let job_completed = ctx.escrow.get_job(&job_id);
    assert_eq!(job_completed.status, Status::Completed);
    assert_eq!(ctx.token.balance(&ctx.freelancer), 500);
    assert_eq!(ctx.token.balance(&ctx.escrow.address), 0);

    // 4. Submit Rating (makes cross-contract call to ReputationContract)
    ctx.escrow.submit_rating(&job_id, &5);
    let job_rated = ctx.escrow.get_job(&job_id);
    assert!(job_rated.rated);

    // Verify reputation contract received the rating
    let rep = ctx.reputation.get_reputation(&ctx.freelancer);
    assert_eq!(rep.total_score, 5);
    assert_eq!(rep.rating_count, 1);
}

#[test]
fn test_refund_after_deadline() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &200,
        &SorobanString::from_str(&ctx.env, "Logo Design"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);

    // Set ledger timestamp before deadline - refund should fail
    ctx.env.ledger().set_timestamp(deadline - 10);
    let refund_attempt = ctx.escrow.try_refund_job(&job_id);
    assert!(refund_attempt.is_err());

    // Set ledger timestamp at/after deadline - refund should succeed
    ctx.env.ledger().set_timestamp(deadline + 10);
    ctx.escrow.refund_job(&job_id);

    let job = ctx.escrow.get_job(&job_id);
    assert_eq!(job.status, Status::Refunded);
    // Client got tokens back
    assert_eq!(ctx.token.balance(&ctx.client), 1_000_000);
    assert_eq!(ctx.token.balance(&ctx.escrow.address), 0);
}

#[test]
fn test_cannot_rate_twice() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &100,
        &SorobanString::from_str(&ctx.env, "Art Commision"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);
    ctx.escrow.complete_job(&job_id);

    // Rate first time
    ctx.escrow.submit_rating(&job_id, &4);
    
    // Rating again should fail
    let rating_attempt = ctx.escrow.try_submit_rating(&job_id, &5);
    assert!(rating_attempt.is_err());
}

#[test]
fn test_cannot_fund_twice() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &300,
        &SorobanString::from_str(&ctx.env, "Frontend UI Fixes"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);
    // Funding a second time must fail with InvalidStatus error
    let res = ctx.escrow.try_fund_job(&job_id);
    assert!(res.is_err());
}

#[test]
fn test_cannot_complete_twice() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &300,
        &SorobanString::from_str(&ctx.env, "Frontend UI Fixes"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);
    ctx.escrow.complete_job(&job_id);

    // Completing a second time must fail
    let res = ctx.escrow.try_complete_job(&job_id);
    assert!(res.is_err());
}

#[test]
fn test_rating_out_of_range() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &300,
        &SorobanString::from_str(&ctx.env, "UI Design"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);
    ctx.escrow.complete_job(&job_id);

    // Score > 5 must fail with InvalidScore error
    let rating_attempt = ctx.escrow.try_submit_rating(&job_id, &6);
    assert!(rating_attempt.is_err());
}

#[test]
fn test_invalid_amount_rejection() {
    let ctx = setup();
    let deadline = 1000u64;

    // Zero amount must fail
    let zero_res = ctx.escrow.try_create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &0,
        &SorobanString::from_str(&ctx.env, "Zero amount job"),
        &deadline,
    );
    assert!(zero_res.is_err());
}

#[test]
fn test_double_refund_fails() {
    let ctx = setup();
    let deadline = 1000u64;

    let job_id = ctx.escrow.create_job(
        &ctx.client,
        &ctx.freelancer,
        &ctx.token.address,
        &200,
        &SorobanString::from_str(&ctx.env, "Smart Contract Audit"),
        &deadline,
    );

    ctx.escrow.fund_job(&job_id);
    ctx.env.ledger().set_timestamp(deadline + 5);
    ctx.escrow.refund_job(&job_id);

    // Refunding a second time must fail
    let second_refund = ctx.escrow.try_refund_job(&job_id);
    assert!(second_refund.is_err());
}

