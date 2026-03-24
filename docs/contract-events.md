# SoroMint Contract Events

Comprehensive reference for all events emitted by the SoroMint token contract. These events enable backends and external indexers to efficiently track on-chain state changes.

## Event Catalog

All events are published via `env.events().publish(topics, data)` and follow a consistent structure:

- **Topics**: A tuple of `(Symbol, Symbol)` — the contract identifier and the action name.
- **Data**: A tuple containing the relevant parameters for the action.

### `initialized`

Emitted once when the contract is first set up.

| Field | Value |
|---|---|
| **Topic 0** | `symbol_short!("SoroMint")` |
| **Topic 1** | `symbol_short!("init")` |
| **Data** | `(admin: Address, decimal: u32, name: String, symbol: String)` |

**Trigger**: `initialize(admin, decimal, name, symbol)`

---

### `mint`

Emitted whenever new tokens are minted.

| Field | Value |
|---|---|
| **Topic 0** | `symbol_short!("SoroMint")` |
| **Topic 1** | `symbol_short!("mint")` |
| **Data** | `(admin: Address, to: Address, amount: i128, new_balance: i128, new_supply: i128)` |

**Trigger**: `mint(to, amount)` — admin-authorized

**Post-state fields**: `new_balance` is the recipient's balance after the mint; `new_supply` is the total supply after the mint. These allow indexers to track state without re-querying the chain.

---

### `burn`

Emitted whenever tokens are burned from a holder.

| Field | Value |
|---|---|
| **Topic 0** | `symbol_short!("SoroMint")` |
| **Topic 1** | `symbol_short!("burn")` |
| **Data** | `(admin: Address, from: Address, amount: i128, new_balance: i128, new_supply: i128)` |

**Trigger**: `burn(from, amount)` — admin-authorized

**Post-state fields**: `new_balance` is the holder's balance after the burn; `new_supply` is the total supply after the burn.

---

### `ownership_transfer`

Emitted when the admin role is transferred to a new address.

| Field | Value |
|---|---|
| **Topic 0** | `symbol_short!("SoroMint")` |
| **Topic 1** | `symbol_short!("xfer_own")` |
| **Data** | `(prev_admin: Address, new_admin: Address)` |

**Trigger**: `transfer_ownership(new_admin)` — current admin-authorized

---

## Indexer Integration Guide

### Filtering Events

When consuming events from the Soroban RPC or Horizon, filter by topic:

```
Topic 0 = SoroMint
Topic 1 = <action>   (init | mint | burn | xfer_own)
```

### Example: Parsing a `mint` Event (JavaScript)

```javascript
// After fetching transaction events from the Soroban RPC
const mintEvents = events.filter(
  (e) => e.topic[0] === "SoroMint" && e.topic[1] === "mint"
);

for (const event of mintEvents) {
  const [admin, to, amount, newBalance, newSupply] = event.data;
  console.log(`Mint: ${amount} tokens to ${to} (balance: ${newBalance}, supply: ${newSupply})`);
}
```

### Event Ordering

Events are emitted **after** all state mutations within a function have completed. This guarantees that when an indexer processes an event, the corresponding on-chain state is already committed within that transaction.

## Source Code Comments

All event-related functions in `contracts/token/src/events.rs` include NatSpec-style documentation comments (`///`) covering:

- **Purpose** — what the event represents
- **Arguments** — parameter descriptions
- **Event Structure** — the exact topics and data layout

All state-changing functions in `contracts/token/src/lib.rs` document their event emissions in the `# Events` section of their doc comments.
