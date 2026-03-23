# SoroMint Open Source Contribution Issues

This document contains 30 prioritized issues for the SoroMint project, divided into **Backend (15)** and **Smart Contract (15)** categories. These issues are designed to be independent to minimize merge conflicts during development.

---

## 🚀 Conflict Mitigation Strategy
To avoid merge conflicts, please follow these guidelines:
1.  **Backend Development**: All logic should be moved into specific sub-directories: `/server/routes/`, `/server/controllers/`, and `/server/middleware/`. Avoid editing `index.js` directly for new features.
2.  **Smart Contracts**: We will adopt a modular file structure in Rust. Each major feature should have its own module (e.g., `src/access_control.rs`, `src/storage.rs`) which will be included in `lib.rs`.
3.  **Branching**: Every contributor must work on a branch named `feature/[issue-number]-[short-description]`.
4.  **Documentation First**: Add NatSpec-style comments to functions to define interfaces clearly before implementation.

---

## 🛠 Backend Issues (15)

### BE-1: JWT-based Authentication System
-   **Title**: Implement JWT-based Authentication
-   **Description**: Create a secure authentication system using JSON Web Tokens (JWT). This should include a `/login` endpoint (validating Stellar public keys) and a middleware to protect sensitive routes.
-   **Priority**: High
-   **Conflict Risk**: Medium (Shared middleware folder)

### BE-2: API Request Validation with Zod
-   **Title**: Add Request Body Validation for Token Routes
-   **Description**: Use `Zod` (or Joi) to validate incoming request bodies for token creation. Ensure `name`, `symbol`, and `contractId` follow expected formats before DB insertion.
-   **Priority**: Medium
-   **Conflict Risk**: Low (Independent route file)

### BE-3: Centralized Error Handling Middleware
-   **Title**: Standardize API Error Responses
-   **Description**: Implement a global error-handling middleware that catches all `next(error)` calls and returns standard JSON error responses with status codes.
-   **Priority**: Medium
-   **Conflict Risk**: Low (Single file in `/middleware/`)

### BE-4: Comprehensive Logging with Winston
-   **Title**: Implement Structured Logging
-   **Description**: Add `winston` for structured logging. Logs should include timestamp, log level, and request context (path, method), saving to both console and files.
-   **Priority**: Low
-   **Conflict Risk**: Low (Utility file in `/utils/`)

### BE-5: Swagger/OpenAPI 3.0 Documentation
-   **Title**: Add Swagger API Documentation
-   **Description**: Integrate `swagger-jsdoc` and `swagger-ui-express` to auto-generate API documentation at `/api/docs`.
-   **Priority**: High
-   **Conflict Risk**: Low (Configuration in `/config/`)

### BE-6: System Health Check & Network Metadata Route
-   **Title**: Create a Health Check Endpoint
-   **Description**: Add a `/api/health` endpoint that returns the status of MongoDB, the Stellar RPC connection, and the server uptime.
-   **Priority**: Low
-   **Conflict Risk**: Very Low (New route)

### BE-7: Environment Variable Guard
-   **Title**: Implement Environment Variable Validation
-   **Description**: Use a library like `envalid` to ensure the server crashes with a descriptive error if critical variables like `MONGO_URI` or `SOROBAN_RPC_URL` are missing.
-   **Priority**: Medium
-   **Conflict Risk**: Very Low (Init script)

### BE-8: Pagination for Token List Results
-   **Title**: Add Pagination to Token List API
-   **Description**: Update `GET /api/tokens/:owner` to support `limit` and `page` query parameters for better performance with many tokens.
-   **Priority**: Medium
-   **Conflict Risk**: Low (Updates existing route)

### BE-9: Asset Search and Filter Service
-   **Title**: Implement Advanced Filtering for Tokens
-   **Description**: Allow users to filter their token list by `symbol` (case-insensitive) or `name` using query parameters.
-   **Priority**: Low
-   **Conflict Risk**: Low (Updates existing route)

### BE-10: Token Deployment Audit Logs (Mongoose)
-   **Title**: Create an Audit Trail for Deployments
-   **Description**: Implement a new Mongoose model `DeploymentLog` to store every attempt to mint/deploy a token, including successes, failures, and timestamps.
-   **Priority**: Medium
-   **Conflict Risk**: Medium (New model)

### BE-11: Stellar SDK Asset Wrapper Unit Tests
-   **Title**: Add Unit Tests for `stellar-service.js`
-   **Description**: Write Jest unit tests for the functions in `stellar-service.js`, mocking the Stellar SDK where necessary.
-   **Priority**: High
-   **Conflict Risk**: Very Low (New test folder)

### BE-12: API Integration Tests
-   **Title**: Implement API Integration Tests (Supertest)
-   **Description**: Setup an integration testing environment using `Supertest` to verify end-to-end API flows (Create -> Fetch -> Health).
-   **Priority**: High
-   **Conflict Risk**: Very Low (New test folder)

### BE-13: API Rate Limiting
-   **Title**: Add API Rate Limiting to Prevent Abuse
-   **Description**: Use `express-rate-limit` to restrict the number of requests a single IP can make to deployment routes.
-   **Priority**: Low
-   **Conflict Risk**: Very Low (Update to `index.js`)

### BE-14: Redundant RPC Failover Service
-   **Title**: Implement Basic RPC Failover Logic
-   **Description**: Allow configuring multiple `SOROBAN_RPC_URL`s and implement a simple failover if the primary RPC is offline.
-   **Priority**: Low
-   **Conflict Risk**: Medium (Modify `stellar-service.js`)

### BE-15: Database Indexing for Performance
-   **Title**: Optimize MongoDB Collections with Indexes
-   **Description**: Add compound indexes for `ownerPublicKey` and `createdAt` in the Token schema to speed up retrieval.
-   **Priority**: Low
-   **Conflict Risk**: Very Low (Modify `Token.js`)

---

## ⚡ Smart Contract Issues (15)

### SC-1: Base SEP-41 Token Logic
-   **Title**: Core SEP-41 Implementation
-   **Description**: Implement the standard Soroban Token interface including balance tracking, and basic admin functionality for minting and burning.
-   **Priority**: High
-   **Conflict Risk**: High (Base file `lib.rs`) - *Must be completed first.*

### SC-2: Role-Based Access Control (RBAC)
-   **Title**: Multi-Admin Support for Minting
-   **Description**: Implement a permission system where one super-admin can appoint sub-admins authorized to call specific functions like `mint()`.
-   **Priority**: High
-   **Conflict Risk**: Medium (Separate module `access.rs`)

### SC-3: Emergency Pausable Logic
-   **Title**: Add Emergency Stop Functionality
-   **Description**: Implement a "Pause" state that, when active, prevents all `transfer()` and `transfer_from()` calls. Only an admin can toggle this.
-   **Priority**: Medium
-   **Conflict Risk**: Low (Separate module `lifecycle.rs`)

### SC-4: Blacklist/Whitelist Module
-   **Title**: Address Whitelisting/Blacklisting
-   **Description**: Add a state where specific addresses can be banned from interacting with the token (e.g., for regulatory compliance).
-   **Priority**: Medium
-   **Conflict Risk**: Low (Separate module `compliance.rs`)

### SC-5: Comprehensive Event Emissions
-   **Title**: Implement Custom Contract Events
-   **Description**: Define and emit descriptive events for `Mint`, `Burn`, `Pause`, and `Unpause` to facilitate easier indexing by the backend.
-   **Priority**: High
-   **Conflict Risk**: Low (Separate module `events.rs`)

### SC-6: Total Supply Dynamic Tracking
-   **Title**: Real-time Total Supply Reporting
-   **Description**: Ensure the `total_supply` is stored in contract state and accurately adjusted on every mint/burn action.
-   **Priority**: High
-   **Conflict Risk**: Low (Shared state in `storage.rs`)

### SC-7: Ownership Transfer functionality
-   **Title**: Secure Ownership Handover
-   **Description**: Implement a two-step ownership transfer process (Transfer Requested -> Transfer Accepted) to prevent losing control of the admin role.
-   **Priority**: Medium
-   **Conflict Risk**: Low (Separate module `ownership.rs`)

### SC-8: Token Simple Governance (Snapshot Voting)
-   **Title**: Simple Proposal/Voting Mechanism
-   **Description**: A basic module allowing token holders to create and vote on simple proposals (Yes/No) within the contract.
-   **Priority**: Low
-   **Conflict Risk**: Low (New module `governance.rs`)

### SC-9: Dynamic Meta-Data Update
-   **Title**: Admin Update for Token Metadata
-   **Description**: Allow an admin to update the `name` or `symbol` of the token after deployment (excluding `decimals`).
-   **Priority**: Low
-   **Conflict Risk**: Low (Metadata module)

### SC-10: Configureable Transfer Tax (Fee-on-Transfer)
-   **Title**: Optional Transaction Fee Logic
-   **Description**: Add a configurable percentage fee that is deducted from every transfer and sent to a "Treasury" address.
-   **Priority**: Low
-   **Conflict Risk**: Medium (Modifies `transfer` logic)

### SC-11: Contract Versioning & Health Checks
-   **Title**: Internal Versioning Export
-   **Description**: Add a `version()` and `contract_type()` public function for better tracking of deployed contracts on the explorer.
-   **Priority**: Low
-   **Conflict Risk**: Very Low (New public functions)

### SC-12: Core Logic Unit Tests
-   **Title**: Comprehensive Rust Unit Testing
-   **Description**: Implement thorough unit tests in Rust for the core transfer and balance tracking logic using the Soroban host environment.
-   **Priority**: High
-   **Conflict Risk**: Very Low (In `lib.rs` #[test] but isolated)

### SC-13: Contract Integration Tests (Env Mocking)
-   **Title**: Cross-Contract Integration Tests
-   **Description**: Write tests that simulate interaction between the Factory and deployed tokens to ensure permissions are preserved.
-   **Priority**: High
-   **Conflict Risk**: Very Low (Separate test files)

### SC-14: Meta-data Decentralized Storage Link
-   **Title**: Support for IPFS Hash Metadata
-   **Description**: Allow storing an optional IPFS content hash to link tokens to rich metadata or logos.
-   **Priority**: Low
-   **Conflict Risk**: Low (Separate storage key)

### SC-15: Gas Usage Profiling & Storage Optimization
-   **Title**: Gas Audit and Optimization
-   **Description**: Profile the gas cost of each function and optimize storage keys (e.g., using `Temporary` vs `Persistent` storage where appropriate).
-   **Priority**: Medium
-   **Conflict Risk**: Medium (Updates multiple files to refine storage)

---

## 📝 How to use these issues
1. Create a `New Issue` on GitHub/Gitlab.
2. Copy the Title and Description.
3. Add relevant labels (e.g., `good-first-issue`, `backend`, `smart-contract`).
4. Link duplicate or prerequisite issues in the comments.
5. Watch the contributions flow in!
