#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    Address, Env, IntoVal, String, Val, Vec,
};

fn setup() -> (Env, Address, Address, SoroMintTokenClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register(SoroMintToken, ());
    let client = SoroMintTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "SoroMint"),
        &String::from_str(&env, "SMT"),
    );

    (env, admin, user, client)
}

fn last_event_data(env: &Env) -> Val {
    let events = env.events().all();
    let last = events.last().expect("expected at least one event");
    last.2
}

fn find_event_by_action(env: &Env, action: Val) -> Option<Val> {
    env.events()
        .all()
        .iter()
        .rev()
        .find(|(_, topics, _)| {
            let topic_values: Vec<Val> = topics.clone();
            topic_values.len() == 2
                && topic_values.get(1).unwrap().get_payload() == action.get_payload()
        })
        .map(|(_, _, data)| data)
}

#[test]
fn test_initialize_sets_zero_supply_and_no_user_balance() {
    let (_, _, user, client) = setup();

    assert_eq!(client.supply(), 0);
    assert_eq!(client.balance(&user), 0);
}

#[test]
fn test_initialize_emits_metadata_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SoroMintToken, ());
    let client = SoroMintTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "SoroMint"),
        &String::from_str(&env, "SMT"),
    );

    let data: (Address, u32, String, String) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, admin);
    assert_eq!(data.1, 7);
    assert_eq!(data.2, String::from_str(&env, "SoroMint"));
    assert_eq!(data.3, String::from_str(&env, "SMT"));
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let (env, admin, _, _) = setup();
    let contract_id = env.register(SoroMintToken, ());
    let client = SoroMintTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "SoroMint"),
        &String::from_str(&env, "SMT"),
    );
    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "SoroMint"),
        &String::from_str(&env, "SMT"),
    );
}

#[test]
fn test_mint_updates_balance_and_supply() {
    let (_, _, user, client) = setup();

    client.mint(&user, &1_000);

    assert_eq!(client.balance(&user), 1_000);
    assert_eq!(client.supply(), 1_000);
}

#[test]
fn test_sequential_mints_preserve_running_totals() {
    let (_, _, user, client) = setup();

    client.mint(&user, &400);
    client.mint(&user, &250);

    assert_eq!(client.balance(&user), 650);
    assert_eq!(client.supply(), 650);
}

#[test]
fn test_minting_multiple_accounts_keeps_balances_isolated() {
    let (env, _, user_one, client) = setup();
    let user_two = Address::generate(&env);

    client.mint(&user_one, &700);
    client.mint(&user_two, &300);

    assert_eq!(client.balance(&user_one), 700);
    assert_eq!(client.balance(&user_two), 300);
    assert_eq!(client.supply(), 1_000);
}

#[test]
fn test_mint_emits_event_with_new_balance_and_supply() {
    let (env, admin, user, client) = setup();

    client.mint(&user, &500);

    let data: (Address, Address, i128, i128, i128) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, admin);
    assert_eq!(data.1, user);
    assert_eq!(data.2, 500);
    assert_eq!(data.3, 500);
    assert_eq!(data.4, 500);
}

#[test]
#[should_panic(expected = "mint amount must be positive")]
fn test_mint_zero_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &0);
}

#[test]
#[should_panic(expected = "mint amount must be positive")]
fn test_mint_negative_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &-1);
}

#[test]
#[should_panic(expected = "balance overflow")]
fn test_mint_overflow_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &i128::MAX);
    client.mint(&user, &1);
}

#[test]
fn test_transfer_moves_balance_without_changing_supply() {
    let (env, _, user, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&user, &1_000);
    client.transfer(&user, &recipient, &300);

    assert_eq!(client.balance(&user), 700);
    assert_eq!(client.balance(&recipient), 300);
    assert_eq!(client.supply(), 1_000);
}

#[test]
fn test_transfer_to_self_keeps_same_balance_and_supply() {
    let (_, _, user, client) = setup();

    client.mint(&user, &500);
    client.transfer(&user, &user, &200);

    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.supply(), 500);
}

#[test]
fn test_transfer_emits_expected_event() {
    let (env, _, user, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&user, &900);
    client.transfer(&user, &recipient, &250);

    let data: (Address, Address, i128, i128, i128) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, user);
    assert_eq!(data.1, recipient);
    assert_eq!(data.2, 250);
    assert_eq!(data.3, 650);
    assert_eq!(data.4, 250);
}

#[test]
#[should_panic(expected = "transfer amount must be positive")]
fn test_transfer_zero_panics() {
    let (env, _, user, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&user, &100);
    client.transfer(&user, &recipient, &0);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_transfer_more_than_balance_panics() {
    let (env, _, user, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&user, &100);
    client.transfer(&user, &recipient, &101);
}

#[test]
fn test_approve_sets_and_overwrites_allowance() {
    let (env, _, user, client) = setup();
    let spender = Address::generate(&env);

    client.approve(&user, &spender, &300);
    assert_eq!(client.allowance(&user, &spender), 300);

    client.approve(&user, &spender, &125);
    assert_eq!(client.allowance(&user, &spender), 125);
}

#[test]
fn test_approve_zero_clears_allowance() {
    let (env, _, user, client) = setup();
    let spender = Address::generate(&env);

    client.approve(&user, &spender, &50);
    client.approve(&user, &spender, &0);

    assert_eq!(client.allowance(&user, &spender), 0);
}

#[test]
fn test_approve_emits_expected_event() {
    let (env, _, user, client) = setup();
    let spender = Address::generate(&env);

    client.approve(&user, &spender, &220);

    let data: (Address, Address, i128) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, user);
    assert_eq!(data.1, spender);
    assert_eq!(data.2, 220);
}

#[test]
#[should_panic(expected = "allowance amount cannot be negative")]
fn test_approve_negative_panics() {
    let (env, _, user, client) = setup();
    let spender = Address::generate(&env);

    client.approve(&user, &spender, &-1);
}

#[test]
fn test_transfer_from_uses_allowance_and_updates_balances() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &1_000);
    client.approve(&owner, &spender, &400);
    client.transfer_from(&spender, &owner, &recipient, &250);

    assert_eq!(client.balance(&owner), 750);
    assert_eq!(client.balance(&recipient), 250);
    assert_eq!(client.allowance(&owner, &spender), 150);
    assert_eq!(client.supply(), 1_000);
}

#[test]
fn test_transfer_from_to_self_consumes_allowance_without_changing_balance() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);

    client.mint(&owner, &500);
    client.approve(&owner, &spender, &200);
    client.transfer_from(&spender, &owner, &owner, &120);

    assert_eq!(client.balance(&owner), 500);
    assert_eq!(client.allowance(&owner, &spender), 80);
    assert_eq!(client.supply(), 500);
}

#[test]
fn test_transfer_from_emits_expected_event() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &800);
    client.approve(&owner, &spender, &500);
    client.transfer_from(&spender, &owner, &recipient, &300);

    let action: Val = symbol_short!("xfer_from").into_val(&env);
    let event = find_event_by_action(&env, action).expect("expected transfer_from event");
    let data: (Address, Address, Address, i128, i128, i128, i128) = event.into_val(&env);
    assert_eq!(data.0, spender);
    assert_eq!(data.1, owner);
    assert_eq!(data.2, recipient);
    assert_eq!(data.3, 300);
    assert_eq!(data.4, 200);
    assert_eq!(data.5, 500);
    assert_eq!(data.6, 300);
}

#[test]
#[should_panic(expected = "insufficient allowance")]
fn test_transfer_from_more_than_allowance_panics() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &500);
    client.approve(&owner, &spender, &100);
    client.transfer_from(&spender, &owner, &recipient, &101);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_transfer_from_more_than_balance_panics_even_with_allowance() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &100);
    client.approve(&owner, &spender, &300);
    client.transfer_from(&spender, &owner, &recipient, &150);
}

#[test]
fn test_transfer_from_exhausts_allowance_exactly() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&owner, &250);
    client.approve(&owner, &spender, &250);
    client.transfer_from(&spender, &owner, &recipient, &250);

    assert_eq!(client.balance(&owner), 0);
    assert_eq!(client.balance(&recipient), 250);
    assert_eq!(client.allowance(&owner, &spender), 0);
}

#[test]
fn test_transfer_from_sequential_calls_preserve_running_state() {
    let (env, _, owner, client) = setup();
    let spender = Address::generate(&env);
    let recipient_one = Address::generate(&env);
    let recipient_two = Address::generate(&env);

    client.mint(&owner, &1_000);
    client.approve(&owner, &spender, &700);
    client.transfer_from(&spender, &owner, &recipient_one, &200);
    client.transfer_from(&spender, &owner, &recipient_two, &300);

    assert_eq!(client.balance(&owner), 500);
    assert_eq!(client.balance(&recipient_one), 200);
    assert_eq!(client.balance(&recipient_two), 300);
    assert_eq!(client.allowance(&owner, &spender), 200);
    assert_eq!(client.supply(), 1_000);
}

#[test]
fn test_burn_updates_balance_and_supply() {
    let (_, _, user, client) = setup();

    client.mint(&user, &1_000);
    client.burn(&user, &400);

    assert_eq!(client.balance(&user), 600);
    assert_eq!(client.supply(), 600);
}

#[test]
fn test_burn_all_tokens_restores_zero_state() {
    let (_, _, user, client) = setup();

    client.mint(&user, &500);
    client.burn(&user, &500);

    assert_eq!(client.balance(&user), 0);
    assert_eq!(client.supply(), 0);
}

#[test]
fn test_burn_emits_event_with_new_balance_and_supply() {
    let (env, admin, user, client) = setup();

    client.mint(&user, &900);
    client.burn(&user, &300);

    let data: (Address, Address, i128, i128, i128) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, admin);
    assert_eq!(data.1, user);
    assert_eq!(data.2, 300);
    assert_eq!(data.3, 600);
    assert_eq!(data.4, 600);
}

#[test]
#[should_panic(expected = "insufficient balance to burn")]
fn test_burn_more_than_balance_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &100);
    client.burn(&user, &101);
}

#[test]
#[should_panic(expected = "burn amount must be positive")]
fn test_burn_zero_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &100);
    client.burn(&user, &0);
}

#[test]
#[should_panic(expected = "burn amount must be positive")]
fn test_burn_negative_panics() {
    let (_, _, user, client) = setup();

    client.mint(&user, &100);
    client.burn(&user, &-1);
}

#[test]
fn test_supply_matches_sum_of_balances_after_mixed_operations() {
    let (env, _, user_one, client) = setup();
    let user_two = Address::generate(&env);
    let user_three = Address::generate(&env);
    let spender = Address::generate(&env);

    client.mint(&user_one, &700);
    client.mint(&user_two, &300);
    client.approve(&user_one, &spender, &150);
    client.transfer_from(&spender, &user_one, &user_three, &125);
    client.burn(&user_one, &200);

    let total_user_balances =
        client.balance(&user_one) + client.balance(&user_two) + client.balance(&user_three);
    assert_eq!(client.supply(), total_user_balances);
}

#[test]
fn test_transfer_ownership_emits_expected_event() {
    let (env, old_admin, _, client) = setup();
    let new_admin = Address::generate(&env);

    client.transfer_ownership(&new_admin);

    let data: (Address, Address) = last_event_data(&env).into_val(&env);
    assert_eq!(data.0, old_admin);
    assert_eq!(data.1, new_admin);
}

#[test]
fn test_transfer_ownership_changes_admin_used_in_follow_up_mint_event() {
    let (env, _, user, client) = setup();
    let new_admin = Address::generate(&env);

    client.transfer_ownership(&new_admin);
    client.mint(&user, &250);

    let mint_action: Val = symbol_short!("mint").into_val(&env);
    let mint_event = find_event_by_action(&env, mint_action).expect("expected mint event");
    let data: (Address, Address, i128, i128, i128) = mint_event.into_val(&env);
    assert_eq!(data.0, new_admin);
    assert_eq!(data.1, user);
    assert_eq!(data.2, 250);
    assert_eq!(data.3, 250);
    assert_eq!(data.4, 250);
}
