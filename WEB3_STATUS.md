# Web3 / On-Chain Status — Pentacle Star Vaults + ESMS Economy

_Last verified: 2026-07-19. Source of truth for the on-chain deployment + wiring._

## TL;DR

The hardened contracts are **deployed and live on Arc testnet + Base Sepolia** (testnet-first).
Arc is **fully verified correct**. On Base Sepolia the shop ESMS token works and the active
settlement wallet (`0x8a332B…`) holds **both MINTER and BURNER** (verified on-chain) and is funded
with gas — the full mint→burn loop is proven on-chain (see below). All 93 contract tests pass (`forge test`) and 700 vitest integration tests pass cleanly with 0 TypeScript errors (`bun run check`). The off-chain claim debit still
needs `ALCHM_KITCHEN_SYNC_URL` + `ALCHM_KITCHEN_SYNC_SECRET` set (matched to WTEN's secret) for the
app-level claim, or the claim route 503s before minting. **Nothing is on mainnet.** All privileged
keys in use are chat-exposed testnet throwaways and **must be regenerated before mainnet** — do it as
part of the mainnet migration into a Safe/KMS (a testnet-only rotation on 2026-06-17 broke the loop
and was reverted; see the rotation note below). Re-verify any time with `bun run scripts/verify-deploy.ts`.

## Deployed contracts

| Contract                   | Arc Testnet (5042002)                        | Base Sepolia (84532)                                |
| -------------------------- | -------------------------------------------- | --------------------------------------------------- |
| **EsmsToken** (UUPS proxy) | `0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F` | `0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F` (same) |
| **StarVault**              | `0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6` | _(not deployed — Arc only)_                         |
| **ConstellationDeed**      | `0x6B4EE164320e9E5583C0F6BEe14D5BABb5ba5095` | `0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6` ⚠️     |
| **ConstellationAMM**       | `0x34d860Cb460ecD2595584138d22Ad6fe7DAeA3BB` | `0x6B4EE164320e9E5583C0F6BEe14D5BABb5ba5095` ⚠️     |

⚠️ **Base Deed/AMM are at different addresses than Arc.** `Deploy.s.sol` (Base) has no
`StarVault`, so it does one fewer contract creation before the Deed/AMM and the deployer's
nonce sequence shifts them. `0x34d8…` is **empty** on Base. This is **harmless** — the app
runs the Constellation AMM on **Arc** (`lib/staking/amm.ts` → `arcChain`), so the Base
Deed/AMM are orphaned/unused. Only the ESMS token (`0x124E…`) is used on Base (by the shop).

## Privileged roles (separation of duties — Q2)

| Role                                               | Address                                                              | Notes                                                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Deployer / `DEFAULT_ADMIN` / `UPGRADER` / `PAUSER` | `0x554F991D030aDF539CBD2ff3D896951C6f089804`                         | **NOT a minter** (verified). Testnet throwaway.                                                                                      |
| `ATTESTOR_ROLE` (vault + AMM)                      | `0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be`                         | Hot feeder key. Backend must sign with its secret.                                                                                   |
| `MINTER_ROLE` (legacy)                             | `0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99`                         | Original minter — still holds the role on both chains, but UNUSED.                                                                   |
| `MINTER_ROLE` + `BURNER_ROLE` (active settlement)  | `0x8a332B96232f443931cc423DaC86403a6c752475`                         | **Active** wallet — `.env` MINTER/REDEEMER keys derive to this; signs claimMint + redeemFor on Base Sepolia. Funded; roles verified. |
| Star registry root (`starRoot`)                    | `0x505ac1166c3d841ea3a0bfe89e887a6204aff19cca24974ed3f309dd4bef2aee` | 15 bright stars; regen via `bun run scripts/compute-star-root.ts`.                                                                   |
| `maxYieldRatePerUsdcPerDay`                        | `5e16` (0.05 ESMS / USDC / day)                                      | On-chain claim cap.                                                                                                                  |

## Arc verification (all ✅, on-chain)

- `starRoot` matches the registry; Sirius pre-activated; un-registered star gated off.
- `maxYieldRatePerUsdcPerDay = 5e16` — the attestor mint cap is live.
- Attestor holds `ATTESTOR_ROLE` on vault **and** AMM → claims will verify.
- Vault, AMM, and the separate minter hold the right `MINTER`/`BURNER` roles.
- **Deployer is NOT a minter** — the role separation held on-chain.
- All 6 AMM pools admin-seeded (`1e21` virtual reserves) → no first-depositor exposure.

## Off-chain wiring (in this repo)

- `lib/staking/arc.ts` / `amm.ts` — per-id `usedNonce`, `yieldCap`, `activateStar`, `minShares`.
- `app/api/staking/claim-attestation` — per-star nonce + clamps signed amount to on-chain `yieldCap`.
- `app/api/staking/pool-attestation` — per-constellation nonce.
- `app/api/staking/star-proof` + `lib/staking/star-registry.ts` — Merkle proofs for lazy `activateStar`.
- `lib/staking/useStarStaking.ts` — awakens a star before its first stake.
- `lib/staking/deployment.ts` — canonical public Arc/Base Sepolia deployment registry; env vars
  remain optional overrides rather than a hidden requirement for previews and fresh installs.
- `components/staking/PentaclesNetworkStatus.tsx` — reads all four Arc contract bytecodes in the
  browser and exposes the active EVM testnet/chain ID directly on `/pentacles` and onboarding.
- `lib/esms-chain/*` + `app/api/shop/purchase` + `components/shop/ShopClient.tsx` — signed `redeemFor`
  (server issues an EIP-712 `RedeemAuthorization` challenge; the buyer's Privy wallet signs).

## Cross-Repo Integration — verified state (audited 2026-06-17)

**✅ Confirmed on-chain / in code:**

1. **Unified settlement wallet `0x8a332B…` holds MINTER + BURNER on Base Sepolia** (read directly
   on-chain). Both repos' `.env` MINTER/REDEEMER keys derive to it; both point `ESMS_CONTRACT_ADDRESS`
   at `0x124E…` and `NEXT_PUBLIC_ESMS_CHAIN=base-sepolia`.
2. **WTEN spend path exists and is a faithful mirror** — `src/lib/esms-chain/*` (byte-identical
   copies) + `src/app/api/economy/shop/purchase/route.ts`. It burns the real `0x124E…` token via
   `redeemFor`, issues the same EIP-712 `RedeemAuthorization` challenge, and writes a `user_purchases`
   entitlement read back by `tokenEconomy.hasActivePurchase`. (WTEN uses a `src/` layout.)
3. **Same Privy app id** `cmi9t84qs00acl80dam2j8195` — hardcoded fallback in both frontends
   (Agents `ShopClient.tsx`/`PrivyConnect.tsx`, WTEN `account/page.tsx`), so the user's embedded
   wallet is identical across sites.

**🐛 Bugs found in the WTEN route and FIXED this pass** (`src/app/api/economy/shop/purchase/route.ts`):

- **orderId collision** — the previous `Buffer.from(userId+":"+slug+":"+nonce).slice(0,64)` truncated
  away the slug/nonce (a userId UUID alone is 72 hex chars), so every item a user bought collided to
  one orderId → after the first burn, every later purchase hit the `redeemedOrders` reconcile branch
  and unlocked **free**. Replaced with `keccak256(toHex("shop:user:slug:nonce"))`, mirroring Agents'
  `shopOrderId`.
- **entitlement never persisted** — the insert passed the tx hash (or `null`) into
  `user_purchases.transaction_group_id`, which is `UUID NOT NULL`, so the write threw on every path.
  Replaced with a `uuid_generate_v4()` insert, idempotent on `(user, item)` via `WHERE NOT EXISTS`.

**✅ On-chain spend primitive PROVEN end-to-end (Base Sepolia, 2026-06-17):**

Ran `scripts/prove-loop.ts` — funded the settlement wallet, then minted to a throwaway holder, had
the holder sign an EIP-712 `RedeemAuthorization`, and burned it via `redeemFor`:

- Funded `0x8a332B…` with 0.01 ETH from the deployer — tx `0x295631043c0830dc7f04789bdfc769beff43fce62f552048cf3a9e8bda754acc`
- `claimMint` 5/3/2/1 ESMS to holder — tx `0xba605bd7062be726a6b6ed6e33768af1316523ffdd9548a5699510b4c1ebdc9c`
- `redeemFor` burn (holder-signed) — tx `0xd8c97b255419703a35aa1aff1d0c5bb6fb2949473d58de91fa81bfb997ed26e8`
- Holder ESMS balance went **5/3/2/1 → 0/0/0/0**. The EIP-712 sig being accepted confirms the
  deployed contract's domain (`EsmsToken`/`1`) matches `lib/esms-chain/contract.ts`.

`scripts/verify-deploy.ts` is now fully green (roles + gas). Re-run `bun run scripts/prove-loop.ts`
to repeat the demo (auto-funds if the wallet runs dry).

**🟡 Remaining for the full APP-LEVEL loop (HTTP routes + DB entitlement, both sites):**

1. **Off-chain claim debit not configured** — `ALCHM_KITCHEN_SYNC_URL` + `ALCHM_KITCHEN_SYNC_SECRET`
   are unset in the Agents `.env`, so `app/api/esms/claim` 503s before minting. Set both (URL → WTEN
   base URL, secret → WTEN's `ALCHM_KITCHEN_SYNC_SECRET`) in whatever env runs the claim.
2. **Keep the settlement wallet funded** — each sponsored `claimMint`/`redeemFor` spends gas; top up
   `0x8a332B…` from a faucet/the deployer as needed.
3. **WTEN `.env`** sets `ESMS_CONTRACT_ADDRESS` + `NEXT_PUBLIC_ESMS_CHAIN` + `REDEEMER_PRIVATE_KEY`
   (=`0x8a332B…`) ✅ — no `MINTER_PRIVATE_KEY` (WTEN only burns, never mints), which is correct.

## ⚠️ Key-rotation incident (2026-06-17) — attempted on testnet, reverted

An agent session tried to rotate the settlement key to a new wallet `0x5A38F3…`. It **revoked**
MINTER+BURNER from `0x8a332B…` and granted them to `0x5A38F3…` on Base Sepolia — but it never wrote
the new key into either repo's `.env`, never funded `0x5A38F3…`, and never printed the key. Net
result: the new wallet's authority was **stranded** (unusable, no key) and the **live loop broke**
(the `.env` wallet `0x8a332B…` had its roles revoked, so `claimMint`/`redeemFor` reverted).

**Recovery** (deployer = `DEFAULT_ADMIN`, `scripts/restore-roles.ts`): re-granted MINTER
(tx `0x8fbc029dc71785c1147bf934f06e7499404a7484f8decea5b9b46c4d14740b76`) + BURNER
(tx `0x300c6ea775797852ea5d067ab30c7abaf458b7b83cc177c4bcb7a834650e58ee`) to `0x8a332B…`, and revoked
MINTER (tx `0x4141837e163b0c5935a18d2ccab5b46f5e66b85b4ef9c1fe8081fb472d1ed4e4`) + BURNER
(tx `0xf2b457f89c5d54c7a03e86914fad8b123b5be8eb7a9ea1142bed27729bbfa4d2`) from `0x5A38F3…`.

**Lesson:** don't rotate keys on testnet — the throwaway keys are fine there. Do the real rotation as
part of the mainnet migration into a Safe/KMS, and always provision + fund the new key _before_
revoking the old one (grant-new → wire-env → fund → verify → revoke-old).

## 🔒 Before mainnet (NON-NEGOTIABLE)

- **Regenerate every key** (deployer, attestor, minter, redeemer) in a wallet/KMS — the current
  ones are exposed in chat logs.
- **Hand `DEFAULT_ADMIN` + `UPGRADER` + `PAUSER` to a Gnosis Safe + timelock**, then renounce the
  deployer EOA's roles. A single hot key controlling UUPS upgrades over a live economy is a rug vector.
- Set `REDEEMER_ADDRESS` before running `Deploy.s.sol` so the settlement wallet gets `BURNER`
  automatically (no manual grant).
- For real USDC custody in `StarVault` (immutable, no upgrade path): get a professional audit first.
