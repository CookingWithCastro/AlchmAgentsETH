# Integration Plan: Cross-Repo ESMS Spend

## Phase 1: Investigation Findings

1. **Agents Claim Flow**:
   - Code located in `app/api/esms/claim/route.ts` and `lib/esms-chain/minter.ts`.
   - It performs an idempotent debit against the off-chain `token_balances` ledger (via `syncDebitToAlchm`).
   - It then issues an on-chain `claimMint` to the user's wallet on `base-sepolia` via a backend Privy minter wallet.

2. **Agents Spend / Unlock**:
   - Code located in `app/api/shop/purchase/route.ts` and `lib/esms-chain/redeemer.ts`.
   - The user must claim tokens to the chain before buying digital items.
   - The app verifies an EIP-712 `RedeemAuthorization` signature from the user.
   - The backend settlement wallet calls `redeemFor` on `base-sepolia` (sponsored gas) and then writes an entitlement to the DB.

3. **WhatToEatNext (WTEN) Integration**:
   - Location: `/Users/cookingwithcastro/Desktop/WhatToEatNext-master`.
   - WTEN uses the same Privy App ID (`NEXT_PUBLIC_PRIVY_APP_ID=cmi9t84qs00acl80dam2j8195`). This ensures the user's Privy embedded wallet addresses match.
   - WTEN connects to the same database (uses `token_balances` for off-chain ESMS balances).
   - WTEN currently lacks `viem` (required for on-chain operations) in its `package.json`.
   - WTEN needs a mirrored `redeemFor` backend loop.

## Phase 2: Implementation Steps

1. **Agents Env Configuration**:
   - Verify `ESMS_CONTRACT_ADDRESS` and `NEXT_PUBLIC_ESMS_CHAIN=base-sepolia` are set.
   - Run a `claim` using a test script to ensure the Base Sepolia flow works.

2. **WTEN Setup**:
   - Install `viem` in WTEN.
   - Migrate/Copy the core `lib/esms-chain/{contract.ts,redeemer.ts}` files into WTEN.
   - Add a spend API route in WTEN (e.g., `app/api/shop/purchase-onchain/route.ts`) to handle the same EIP-712 signing challenge and `redeemFor` logic.
   - Grant `BURNER_ROLE` on the `EsmsToken` on Base Sepolia to WTEN's redeemer wallet address (or verify they use the same redeemer wallet).
   - Wire a simple WTEN feature entitlement system upon successful on-chain burn.

3. **Validation**:
   - Verify claiming and spending via both codebases.
