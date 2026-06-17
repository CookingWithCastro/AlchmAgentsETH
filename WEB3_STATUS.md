# Web3 / On-Chain Status — Pentacle Star Vaults + ESMS Economy

_Last updated: 2026-06-17. Source of truth for the on-chain deployment + wiring._

## TL;DR

The hardened contracts are **deployed and live on Arc testnet + Base Sepolia** (testnet-first).
Arc is **fully verified correct**. Base Sepolia's shop token works, but has **two follow-ups**
(a `BURNER` grant and the Vercel attestor key). **Nothing is on mainnet.** All privileged keys
in use are chat-exposed testnet throwaways and **must be regenerated before mainnet.**

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

| Role                                               | Address                                                              | Notes                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Deployer / `DEFAULT_ADMIN` / `UPGRADER` / `PAUSER` | `0x554F991D030aDF539CBD2ff3D896951C6f089804`                         | **NOT a minter** (verified). Testnet throwaway.                    |
| `ATTESTOR_ROLE` (vault + AMM)                      | `0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be`                         | Hot feeder key. Backend must sign with its secret.                 |
| `MINTER_ROLE`                                      | `0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99`                         | Backend minter (and assumed shop settlement wallet).               |
| Star registry root (`starRoot`)                    | `0x505ac1166c3d841ea3a0bfe89e887a6204aff19cca24974ed3f309dd4bef2aee` | 15 bright stars; regen via `bun run scripts/compute-star-root.ts`. |
| `maxYieldRatePerUsdcPerDay`                        | `5e16` (0.05 ESMS / USDC / day)                                      | On-chain claim cap.                                                |

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
- `lib/esms-chain/*` + `app/api/shop/purchase` + `components/shop/ShopClient.tsx` — signed `redeemFor`
  (server issues an EIP-712 `RedeemAuthorization` challenge; the buyer's Privy wallet signs).

## 🔴 Open action items

1. **Base Sepolia — grant `BURNER_ROLE` to the shop settlement wallet** (sponsored `redeemFor` reverts without it):

   ```bash
   cd contracts && set -a && source .env && set +a && \
   cast send 0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F \
     "grantRole(bytes32,address)" \
     0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848 \
     0x984dbdA6da6D80c95b4A8Ff9b05cb62b2D27dC99 \
     --rpc-url https://sepolia.base.org --private-key "$DEPLOYER_PRIVATE_KEY"
   ```

   (Swap `0x984dbd…` for your real redeemer wallet if it differs from the minter.)

2. **Vercel env** — set so the live app matches the chain:
   - `ARC_ATTESTOR_PRIVATE_KEY` = the secret for `0x6a9a906A…` (else every claim reverts `YieldBadSigner`).
   - `ESMS_CONTRACT_ADDRESS=0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F`, `NEXT_PUBLIC_ESMS_CHAIN=base-sepolia`.
   - `NEXT_PUBLIC_ARC_ESMS_ADDRESS` / `NEXT_PUBLIC_STAR_VAULT_ADDRESS` /
     `NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS` / `NEXT_PUBLIC_CONSTELLATION_DEED_ADDRESS` = the **Arc** addresses above.

3. **Re-verify anytime:** `bun run scripts/verify-deploy.ts`.

## 🔒 Before mainnet (NON-NEGOTIABLE)

- **Regenerate every key** (deployer, attestor, minter, redeemer) in a wallet/KMS — the current
  ones are exposed in chat logs.
- **Hand `DEFAULT_ADMIN` + `UPGRADER` + `PAUSER` to a Gnosis Safe + timelock**, then renounce the
  deployer EOA's roles. A single hot key controlling UUPS upgrades over a live economy is a rug vector.
- Set `REDEEMER_ADDRESS` before running `Deploy.s.sol` so the settlement wallet gets `BURNER`
  automatically (no manual grant).
- For real USDC custody in `StarVault` (immutable, no upgrade path): get a professional audit first.
