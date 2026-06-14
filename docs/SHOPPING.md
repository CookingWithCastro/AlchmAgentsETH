# ESMS Bazaar — the token-economy shopping route

The Bazaar (`/shop`) closes the economy loop. Users **earn** ESMS (Star Vault
staking, daily yield, duels/quests) and **buy** it (Stripe token packs), and the
Bazaar is where they **spend** it.

## What's for sale

Three sections, surfaced as tabs:

| Tab            | Items                                   | Settlement                                                                     |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| **Apothecary** | Digital alchemical items & agent boosts | On-chain ESMS burn                                                             |
| **Recipes**    | Premium cosmic recipes                  | On-chain ESMS burn                                                             |
| **Food**       | Real food orders                        | Hands off to the alchm.kitchen restaurant route (ESMS off-chain / USDC / Card) |

Digital goods are priced in a whole-ESMS basket split across Spirit / Essence /
Matter / Substance. Food carries a USD price and a kitchen hand-off.

## Spend model — a real on-chain ESMS burn

ESMS is a **soulbound** ERC-1155 (`contracts/src/EsmsToken.sol`) on Base, so it
cannot be transferred to a shop contract — **the burn IS the spend.** The ESMS a
user claimed to chain (already debited off-chain at claim time via
`/api/esms/claim`) is the authoritative pool for Bazaar purchases. No second
off-chain debit happens.

Two burn paths, both idempotent on a `bytes32 orderId`:

- **`redeem(orderId, ids, amounts)`** — the buyer's own wallet signs and burns
  its balance.
- **`redeemFor(from, orderId, ids, amounts)`** — a vetted `BURNER_ROLE`
  settlement wallet burns on the buyer's behalf, sponsoring gas (the same
  custody model as the minter, so users need no native balance).

`EsmsToken.redeemedOrders[orderId]` rejects a repeat order, so a retried
purchase can never double-burn. A matching `Redeemed(from, orderId, ids,
amounts)` event lets the backend confirm a user-signed burn before fulfilling.

## Request flow

```
POST /api/shop/purchase  { itemId, payWith?, nonce?, txHash? }

 digital + ESMS:
   ├─ one-time unlock already owned ............ { ok, alreadyOwned }
   ├─ orderId already burned on-chain .......... grant + { ok, reconciled }
   ├─ txHash supplied (user signed redeem) ..... verifyRedeem() → grant
   └─ else (sponsored) ......................... check balance → redeemFor() → grant
        └─ insufficient on-chain ESMS .......... 402 { shortfall }  (UI: "Claim more to chain")

 digital + USDC/Card: ........................... { mode: 'topup', url: '/upgrade' }
 food: ......................................... { mode: 'bridge', url: <kitchen> }
```

The bytes32 `orderId` (`keccak256("shop:<userId>:<itemId>:<nonce?>")`) keys both
the on-chain burn idempotency and the off-chain entitlement marker (a
zero-amount `token_transactions` row — the same migration-free pattern as the
context-card unlock).

## Files

| Path                                                        | Role                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `contracts/src/EsmsToken.sol`                               | `redeem` / `redeemFor` / `redeemedOrders` / `Redeemed` |
| `contracts/test/EsmsRedeem.t.sol`                           | burn, idempotency, role, soulbound, pause              |
| `lib/esms-chain/redeemer.ts`                                | sponsored `redeemFor` + `verifyRedeem`                 |
| `lib/esms-chain/contract.ts`                                | ABI + `readEsmsRedeemed` / `esmsOnchainConfigured`     |
| `lib/shop/catalog.ts`                                       | item catalog + kitchen hand-off                        |
| `lib/shop/pricing.ts`                                       | basket math + affordability                            |
| `lib/shop/orders.ts`                                        | deterministic `orderId`                                |
| `lib/shop/entitlement.ts`                                   | fulfillment record / "Owned" state                     |
| `app/api/shop/catalog/route.ts`                             | catalog + on-chain balances + owned                    |
| `app/api/shop/purchase/route.ts`                            | settlement (burn / verify / bridge)                    |
| `app/(app)/shop/page.tsx`, `components/shop/ShopClient.tsx` | the storefront                                         |

## Going live

1. Deploy `EsmsToken` to Base Sepolia (then Base) and set `ESMS_CONTRACT_ADDRESS`.
2. Grant `BURNER_ROLE` to the settlement wallet; set `PRIVY_REDEEMER_WALLET_ID`
   (or `REDEEMER_PRIVATE_KEY`). Reuse the minter wallet if it holds both roles.
3. Users **claim** ESMS to chain (`/economy`) before spending. The Bazaar shows
   on-chain balances and a "Claim to chain" prompt when short.
4. Until `ESMS_CONTRACT_ADDRESS` is set, the Bazaar renders read-only (browse
   now, burns unlock at deploy). Food hand-off works regardless.

Tests: `forge test --match-path test/EsmsRedeem.t.sol` and
`npx vitest run test/shop`.
