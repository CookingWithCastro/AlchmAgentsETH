# AlchmAgents — 5-minute demo script (record this)

> Goal: show one human → ENS-named agents → paid on Arc → memory on Walrus → ranked on
> BigQuery, then the flagship **Pentacle Star Vaults** staking on Arc. Record screen + voice.

## 0. Setup (before recording)

- [ ] `contracts/.env` has a funded `DEPLOYER_PRIVATE_KEY`; run `bash scripts/deploy-arc.sh`.
- [ ] Paste the 5 printed addresses into `.env` **and** into the Vercel project env vars.
- [ ] `bun dev` (or the live Vercel URL) open at `/pentacles`.
- [ ] Have the Arc explorer open on the deploy tx + the StarVault address.

## 1. The thesis (20s)

> "A World ID–verified human runs ENS-named AI agents that get **paid in USDC on Circle Arc**,
> carry encrypted memory on Walrus, and rank on a BigQuery reputation board. Then we let you
> **stake USDC on real stars** and earn elemental yield gated by the live sky."

## 2. Discover — ENS (30s)

```bash
bun run scripts/register-all-agents-ens.ts --set historical --dry-run
```

> "Every agent gets a gasless `*.alchmagents.eth` subname via NameStone, with ENSIP-25/26
> records — its A2A endpoint, x402 wallet, encrypted-memory blob, and a `human-verified` badge."

## 3. Serve + get paid — A2A + x402 on Arc (60s)

```bash
python backend/smoke_test_a2a.py
```

> "One A2A server, a per-agent card, `message/send` + streaming. The endpoint is x402-gated:
> first call returns **402 Payment Required**; pay with an EIP-3009 USDC authorization and we
> **self-settle on Arc** — single chain, USDC is the gas token." (show 7 SSE token events)

## 4. Memory — Walrus (30s)

```bash
bun run scripts/snapshot-persona-walrus.ts --agent plato
```

> "The agent's persona is encrypted and written to Walrus testnet — here's the real `blobId`,
> read back from the aggregator. That blobId is the `agent-memory` ENS record."

## 5. Rank — BigQuery (30s)

> Open `/erc8004`. "A reputation leaderboard built on the **mainnet** ERC-8004 registry via
> BigQuery — ranking x402-payable agents by reputation + validation."

## 6. FLAGSHIP — Pentacle Star Vaults on Arc (90s)

> Open `/pentacles`.
>
> - "A pentagram in a circle makes exactly **11 zones** — each tinted by the live planet
>   controlling it. Real stars plot by their true horizon position."
> - Pick a **dominant element** → watch matching stars' APY jump (chart-affinity multiplier).
> - Click a star → show `dominance × affinity × dignity × visible` breakdown; note it only
>   yields **while risen above your horizon**.
> - **Connect wallet** (Dynamic) on Arc → **Stake** USDC → **Claim** → mints **ESMS** essence.
> - Cut to **Arc explorer**: show the StarVault deploy tx + the stake/claim txs on-chain.
> - "43/43 Foundry tests — custody, pro-rata shares, and every attestation failure mode."

## 7. Close (20s)

> "One human, many ENS agents, paid + staked on Arc, remembered on Walrus, ranked on BigQuery.
> All the contract addresses and verify steps are in SUBMISSION.md."

---

### Fallback if the live deploy isn't ready

Show `forge test` (43/43), the rendered `/pentacles` reads, the A2A SSE stream, and the live
Walrus blobId — all runtime-verified without a funded wallet.
