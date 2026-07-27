#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, Address, testutils::MockAuth, testutils::MockAuthInvoke, IntoVal};

fn setup() -> (Env, ReputationContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let escrow_caller = Address::generate(&env);

    client.initialize(&admin, &escrow_caller);

    (env, client, admin, escrow_caller)
}

#[test]
fn test_initialize_and_get_reputation() {
    let (env, client, _admin, _caller) = setup();
    let freelancer = Address::generate(&env);

    let rep = client.get_reputation(&freelancer);
    assert_eq!(rep.total_score, 0);
    assert_eq!(rep.rating_count, 0);
}

#[test]
fn test_add_rating_success() {
    let (env, client, _admin, _caller) = setup();
    let freelancer = Address::generate(&env);

    // Mock all auths so the authorized caller's require_auth succeeds
    env.mock_all_auths();

    // Add first rating
    let rep1 = client.add_rating(&freelancer, &5);
    assert_eq!(rep1.total_score, 5);
    assert_eq!(rep1.rating_count, 1);

    // Add second rating
    let rep2 = client.add_rating(&freelancer, &4);
    assert_eq!(rep2.total_score, 9);
    assert_eq!(rep2.rating_count, 2);

    // Fetch and check
    let rep_check = client.get_reputation(&freelancer);
    assert_eq!(rep_check.total_score, 9);
    assert_eq!(rep_check.rating_count, 2);
}

#[test]
fn test_invalid_score_rejected() {
    let (env, client, _admin, _caller) = setup();
    let freelancer = Address::generate(&env);

    env.mock_all_auths();
    let result = client.try_add_rating(&freelancer, &6);
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_caller_rejected() {
    let env = Env::default();
    
    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let escrow_caller = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let stranger = Address::generate(&env);

    // Mock only the admin's authorization for initialize
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "initialize",
            args: (&admin, &escrow_caller).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &escrow_caller);
    
    // Mock the stranger's authorization for add_rating.
    // The contract expects authorized_caller (escrow_caller) to authorize the call.
    // Since we only mock stranger's auth, it should fail.
    env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "add_rating",
            args: (&freelancer, 5u32).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let result = client.try_add_rating(&freelancer, &5);
    assert!(result.is_err());
}
