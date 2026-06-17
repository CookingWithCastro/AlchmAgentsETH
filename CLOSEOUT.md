# Closeout Prompt — Pentacle Star Vaults / ESMS on-chain hardening

Paste the block below into a fresh Claude Code / agent session to pick up exactly where this
left off. It is self-contained.

---

> **Context.** You are continuing the on-chain work for AlchmAgents (repo
> `AlchmAgentsETH-main`). A multi-agent audit + guided hardening pass rewrote the Pentacle
> Star Vaults stack and it is now **deployed to Arc testnet (5042002) + Base Sepolia (84532)**.
> Read `WEB3_STATUS.md` first — it is the source of truth for addresses, roles, and verification.
> Also see memory: `contract-hardening-2026-06`, `vercel-and-arc-deploy`, `star-staking-architecture`.
>
> **What's done.**
>
> - 4 contracts hardened (`contracts/src/`): StarVault (on-chain mint cap, Pausable, per-(staker,star)
>   nonce, Merkle star registry + lazy `activateStar`, zero-amount guard), EsmsToken (signed
>   `redeemFor` via EIP-712 `RedeemAuthorization`, id-range guard, pause scoped to redeem),
>   ConstellationAMM (Pausable, per-(trader,const) nonce, `minShares` + on-ratio guard, virtual-reserve
>   `seedInitial`), ConstellationDeed (unchanged). 74 Foundry tests green.
> - Deploy scripts hardened with separation of duties (`DeployStarVault.s.sol` = Arc; `Deploy.s.sol`
>   = Base, now grants `BURNER` to optional `REDEEMER_ADDRESS`).
> - Off-chain TS fully wired (ABIs, claim/pool routes, `useStarStaking` activation, Merkle proof API
>   `app/api/staking/star-proof`, `lib/staking/star-registry.ts`, shop signed-`redeemFor` challenge flow
>   in `components/shop/ShopClient.tsx`).
> - Arc deployment verified 100% correct on-chain. `scripts/verify-deploy.ts` re-runs the checks.
>
> **Open action items (do these):**
>
> 1. Base Sepolia: grant `BURNER_ROLE` to the shop settlement wallet `0x984dbd…` (command in
>    `WEB3_STATUS.md` §"Open action items"). Verify `redeemFor` then works.
> 2. Confirm Vercel env: `ARC_ATTESTOR_PRIVATE_KEY` must be the secret for attestor
>    `0x6a9a906AC3B8AcF21Ca950b8Bf9702d1ADD368Be`, plus `ESMS_CONTRACT_ADDRESS`,
>    `NEXT_PUBLIC_ESMS_CHAIN=base-sepolia`, and the Arc `NEXT_PUBLIC_*` addresses.
> 3. Smoke-test the full loop on testnet: stake USDC on Arc → claim ESMS → spend in the shop on Base.
> 4. Optional next feature: the **Star Agents** layer — listen to `StarActivated` for lazy agent
>    registration, scale agent Vitality/Power from `pools[starId].totalPrincipal`.
>
> **Before any mainnet deploy (hard requirements):** regenerate ALL keys in a KMS/hardware wallet
> (the current ones are chat-exposed testnet throwaways); move `DEFAULT_ADMIN`/`UPGRADER`/`PAUSER`
> to a Gnosis Safe + timelock and renounce the deployer EOA; set `REDEEMER_ADDRESS`; audit StarVault
> before custody of real USDC.
>
> **Constraints.** Use `bun` (not npm/yarn). Contracts: `cd contracts && forge test`. Don't print
> private keys. Don't deploy to mainnet without the key/Safe hardening above.

---

## Session note (why git wasn't committed by the agent)

The hardening + deploy work is complete in the working tree but **was not committed** in-session:
the sandbox hard-locked filesystem access to the project mid-session (`Operation not permitted`
on `ls`/`git`), so `git`/`gh` couldn't run. Create the PR from your own terminal — see the commands
the agent provided (branch `feat/contract-hardening-onchain`).
