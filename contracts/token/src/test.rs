#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize_and_mint() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user = Address::generate(&e);
    let token_id = e.register_contract(None, SoroMintToken);
    let client = SoroMintTokenClient::new(&e, &token_id);

    client.initialize(&admin, &7, &String::from_str(&e, "SoroMint"), &String::from_str(&e, "SMT"));
    
    client.mint(&user, &1000);
    assert_eq!(client.balance(&user), 1000);
}
