#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

mod events;

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Supply,
    Balance(Address),
    Allowance(Address, Address),
}

/// Trait defining the full SoroMint token interface, including
/// minting, burning, balance queries, and ownership management.
pub trait TokenTrait {
    /// Initializes the token contract with an admin and metadata.
    /// Can only be called once.
    fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String);

    /// Transfers `amount` tokens from one address to another.
    fn transfer(e: Env, from: Address, to: Address, amount: i128);

    /// Sets the delegated spending allowance for a spender.
    fn approve(e: Env, from: Address, spender: Address, amount: i128);

    /// Returns the delegated spending allowance for a spender.
    fn allowance(e: Env, from: Address, spender: Address) -> i128;

    /// Transfers `amount` tokens using a delegated allowance.
    fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128);

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
    fn write_balance(e: &Env, id: &Address, balance: i128) {
        e.storage()
            .persistent()
            .set(&DataKey::Balance(id.clone()), &balance);
    }

    fn write_allowance(e: &Env, from: &Address, spender: &Address, amount: i128) {
        e.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender.clone()),
            &amount,
        );
    }

    fn move_balance(e: &Env, from: &Address, to: &Address, amount: i128) -> (i128, i128) {
        let from_balance = Self::balance(e.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }

        if from == to {
            return (from_balance, from_balance);
        }

        let new_from_balance = from_balance
            .checked_sub(amount)
            .expect("balance underflow");
        let to_balance = Self::balance(e.clone(), to.clone());
        let new_to_balance = to_balance.checked_add(amount).expect("balance overflow");

        Self::write_balance(e, from, new_from_balance);
        Self::write_balance(e, to, new_to_balance);

        (new_from_balance, new_to_balance)
    }

    /// Initializes the SoroMint token contract.
    ///
    /// # Arguments
    /// * `admin`   - Address that will serve as the contract administrator.
    /// * `decimal` - Number of decimal places for the token.
    /// * `name`    - Human-readable token name.
    /// * `symbol`  - Token ticker symbol.
    ///
    /// # Panics
    /// Panics if the contract has already been initialized.
    ///
    /// # Events
    /// Emits an `initialized` event with `(admin, decimal, name, symbol)`.
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Supply, &0i128);

        events::emit_initialized(&e, &admin, decimal, &name, &symbol);
    }

    /// Transfers tokens between two addresses.
    ///
    /// # Arguments
    /// * `from`   - The address sending the tokens.
    /// * `to`     - The address receiving the tokens.
    /// * `amount` - The quantity of tokens to transfer.
    ///
    /// # Authorization
    /// Requires the `from` address to authorize the transaction.
    ///
    /// # Panics
    /// Panics if the amount is not positive or the sender has insufficient balance.
    ///
    /// # Events
    /// Emits a `transfer` event with `(from, to, amount, from_balance, to_balance)`.
    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("transfer amount must be positive");
        }
        from.require_auth();

        let (new_from_balance, new_to_balance) = Self::move_balance(&e, &from, &to, amount);
        events::emit_transfer(&e, &from, &to, amount, new_from_balance, new_to_balance);
    }

    /// Approves a spender to use a delegated token allowance.
    ///
    /// # Arguments
    /// * `from`    - The token owner granting the allowance.
    /// * `spender` - The address allowed to spend on behalf of the owner.
    /// * `amount`  - The maximum delegated amount.
    ///
    /// # Authorization
    /// Requires the `from` address to authorize the transaction.
    ///
    /// # Panics
    /// Panics if the allowance amount is negative.
    ///
    /// # Events
    /// Emits an `approve` event with `(from, spender, amount)`.
    pub fn approve(e: Env, from: Address, spender: Address, amount: i128) {
        if amount < 0 {
            panic!("allowance amount cannot be negative");
        }
        from.require_auth();

        Self::write_allowance(&e, &from, &spender, amount);
        events::emit_approve(&e, &from, &spender, amount);
    }

    /// Returns the delegated spending allowance for a spender.
    ///
    /// # Arguments
    /// * `from`    - The token owner.
    /// * `spender` - The delegated spender.
    ///
    /// # Returns
    /// The remaining allowance, or `0` if none has been recorded.
    pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    /// Transfers tokens using a delegated allowance.
    ///
    /// # Arguments
    /// * `spender` - The delegated spender using the allowance.
    /// * `from`    - The token owner whose balance is debited.
    /// * `to`      - The recipient of the tokens.
    /// * `amount`  - The quantity of tokens to transfer.
    ///
    /// # Authorization
    /// Requires the `spender` address to authorize the transaction.
    ///
    /// # Panics
    /// Panics if the amount is not positive, the allowance is too small,
    /// or the owner's balance is insufficient.
    ///
    /// # Events
    /// Emits a `transfer_from` event with
    /// `(spender, from, to, amount, remaining_allowance, from_balance, to_balance)`.
    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("transfer amount must be positive");
        }
        spender.require_auth();

        let allowance = Self::allowance(e.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }

        let remaining_allowance = allowance
            .checked_sub(amount)
            .expect("allowance underflow");
        let (new_from_balance, new_to_balance) = Self::move_balance(&e, &from, &to, amount);

        Self::write_allowance(&e, &from, &spender, remaining_allowance);
        events::emit_transfer_from(
            &e,
            &spender,
            &from,
            &to,
            amount,
            remaining_allowance,
            new_from_balance,
            new_to_balance,
        );
    }

    /// Mints new tokens to a recipient address.
    ///
    /// # Arguments
    /// * `to`     - The address receiving the newly minted tokens.
    /// * `amount` - The quantity of tokens to mint.
    ///
    /// # Authorization
    /// Requires the current admin to authorize the transaction.
    ///
    /// # Events
    /// Emits a `mint` event with `(admin, to, amount, new_balance, new_supply)`.
    pub fn mint(e: Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("mint amount must be positive");
        }
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut balance = Self::balance(e.clone(), to.clone());
        balance = balance.checked_add(amount).expect("balance overflow");
        Self::write_balance(&e, &to, balance);

        let mut supply: i128 = e.storage().instance().get(&DataKey::Supply).unwrap_or(0);
        supply = supply.checked_add(amount).expect("supply overflow");
        e.storage().instance().set(&DataKey::Supply, &supply);

        events::emit_mint(&e, &admin, &to, amount, balance, supply);
    }

    /// Burns tokens from a holder's balance.
    ///
    /// # Arguments
    /// * `from`   - The address whose tokens will be burned.
    /// * `amount` - The quantity of tokens to burn.
    ///
    /// # Authorization
    /// Requires the current admin to authorize the transaction.
    ///
    /// # Panics
    /// Panics if `from` has insufficient balance.
    ///
    /// # Events
    /// Emits a `burn` event with `(admin, from, amount, new_balance, new_supply)`.
    pub fn burn(e: Env, from: Address, amount: i128) {
        if amount <= 0 {
            panic!("burn amount must be positive");
        }
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let balance = Self::balance(e.clone(), from.clone());
        if balance < amount {
            panic!("insufficient balance to burn");
        }
        let new_balance = balance.checked_sub(amount).expect("balance underflow");
        Self::write_balance(&e, &from, new_balance);

        let mut supply: i128 = e.storage().instance().get(&DataKey::Supply).unwrap();
        supply = supply.checked_sub(amount).expect("supply underflow");
        e.storage().instance().set(&DataKey::Supply, &supply);

        events::emit_burn(&e, &admin, &from, amount, new_balance, supply);
    }

    /// Returns the token balance for a given address.
    ///
    /// # Arguments
    /// * `id` - The address to query.
    ///
    /// # Returns
    /// The token balance, or `0` if no balance has been recorded.
    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Returns the total token supply.
    ///
    /// # Returns
    /// The current total supply of minted tokens.
    pub fn supply(e: Env) -> i128 {
        e.storage().instance().get(&DataKey::Supply).unwrap_or(0)
    }

    /// Transfers the admin (owner) role to a new address.
    ///
    /// # Arguments
    /// * `new_admin` - The address that will become the new administrator.
    ///
    /// # Authorization
    /// Requires the current admin to authorize the transaction.
    ///
    /// # Events
    /// Emits an `ownership_transfer` event with `(prev_admin, new_admin)`.
    pub fn transfer_ownership(e: Env, new_admin: Address) {
        let prev_admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        prev_admin.require_auth();

        e.storage().instance().set(&DataKey::Admin, &new_admin);

        events::emit_ownership_transfer(&e, &prev_admin, &new_admin);
    }
}
