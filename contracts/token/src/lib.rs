#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

mod events;

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenInfo {
    pub admin: Address,
    pub supply: i128,
    pub decimals: u32,
    pub name: String,
    pub symbol: String,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenInfo,
    Balance(Address),
}

/// Trait defining the full SoroMint token interface, including
/// minting, burning, balance queries, and ownership management.
pub trait TokenTrait {
    /// Initializes the token contract with an admin and metadata.
    /// Can only be called once.
    fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String);

    /// Mints `amount` tokens to the `to` address. Admin-only.
    fn mint(e: Env, to: Address, amount: i128);

    /// Burns `amount` tokens from the `from` address. Admin-only.
    fn burn(e: Env, from: Address, amount: i128);

    /// Returns the token balance for the given address.
    fn balance(e: Env, id: Address) -> i128;

    /// Returns the total token supply.
    fn supply(e: Env) -> i128;

    /// Transfers the admin role to a new address. Current admin-only.
    fn transfer_ownership(e: Env, new_admin: Address);
}

#[contract]
pub struct SoroMintToken;

#[contractimpl]
impl SoroMintToken {
    /// Initializes the SoroMint token contract.
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if e.storage().instance().has(&DataKey::TokenInfo) {
            panic!("already initialized");
        }

        let info = TokenInfo {
            admin: admin.clone(),
            supply: 0,
            decimals: decimal,
            name: name.clone(),
            symbol: symbol.clone(),
        };

        e.storage().instance().set(&DataKey::TokenInfo, &info);

        // Issue #493: Mandatory Event Logging
        events::emit_initialized(&e, &admin, decimal, &name, &symbol);
    }

    /// Mints new tokens to a recipient address.
    pub fn mint(e: Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("mint amount must be positive");
        }
        
        let mut info: TokenInfo = e.storage().instance().get(&DataKey::TokenInfo).expect("Not initialized");
        info.admin.require_auth();

        let mut balance = Self::balance(e.clone(), to.clone());
        balance = balance.checked_add(amount).expect("balance overflow");
        e.storage().persistent().set(&DataKey::Balance(to.clone()), &balance);

        info.supply = info.supply.checked_add(amount).expect("supply overflow");
        e.storage().instance().set(&DataKey::TokenInfo, &info);

        // Issue #493: Mandatory Event Logging
        events::emit_mint(&e, &info.admin, &to, amount, balance, info.supply);
    }

    /// Burns tokens from a holder's balance.
    pub fn burn(e: Env, from: Address, amount: i128) {
        let mut info: TokenInfo = e.storage().instance().get(&DataKey::TokenInfo).expect("Not initialized");
        info.admin.require_auth();

        let mut balance = Self::balance(e.clone(), from.clone());
        if balance < amount {
            panic!("insufficient balance to burn");
        }
        
        balance -= amount;
        e.storage().persistent().set(&DataKey::Balance(from.clone()), &balance);

        info.supply -= amount;
        e.storage().instance().set(&DataKey::TokenInfo, &info);

        // Issue #493: Mandatory Event Logging
        events::emit_burn(&e, &info.admin, &from, amount, balance, info.supply);
    }

    /// Returns the token balance for a given address.
    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }


    /// Returns the total token supply.
    pub fn supply(e: Env) -> i128 {
        let info: TokenInfo = e.storage().instance().get(&DataKey::TokenInfo).expect("Not initialized");
        info.supply
    }

    /// Transfers the admin (owner) role to a new address.
    pub fn transfer_ownership(e: Env, new_admin: Address) {
        let mut info: TokenInfo = e.storage().instance().get(&DataKey::TokenInfo).expect("Not initialized");
        info.admin.require_auth();

        let prev_admin = info.admin.clone();
        info.admin = new_admin.clone();
        e.storage().instance().set(&DataKey::TokenInfo, &info);

        // Issue #493: Mandatory Event Logging
        events::emit_ownership_transfer(&e, &prev_admin, &new_admin);
    }
}


#[cfg(test)]
mod test;
