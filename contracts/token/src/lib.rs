#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Supply,
    Balance(Address),
}

pub trait TokenTrait {
    fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String);
    fn mint(e: Env, to: Address, amount: i128);
    fn balance(e: Env, id: Address) -> i128;
    // SEP-41 functions will be implemented by contributors
}

#[contract]
pub struct SoroMintToken;

#[contractimpl]
impl SoroMintToken {
    pub fn initialize(e: Env, admin: Address, _decimal: u32, _name: String, _symbol: String) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Supply, &0i128);
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut balance = Self::balance(e.clone(), to.clone());
        balance += amount;
        e.storage().persistent().set(&DataKey::Balance(to), &balance);

        let mut supply: i128 = e.storage().instance().get(&DataKey::Supply).unwrap();
        supply += amount;
        e.storage().instance().set(&DataKey::Supply, &supply);
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage().persistent().get(&DataKey::Balance(id)).unwrap_or(0)
    }
}
