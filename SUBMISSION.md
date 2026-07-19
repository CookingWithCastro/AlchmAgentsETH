# AlchmAgents — EthGlobal Submission

> **A World ID–verified human operates ENS-named AI agents that settle x402 USDC on a single chain (Circle Arc), are discoverable + payable over A2A, carry encrypted memory on Walrus, and rank on a BigQuery reputation leaderboard — plus _Pentacle Star Vaults_: stake USDC on real stars and earn elemental yield gated by the live sky.**

## Live links

| What                      | Link                                                       |
| ------------------------- | ---------------------------------------------------------- |
| Live app                  | **https://alchm-agents-eth.vercel.app** (try `/pentacles`) |
| Demo video                | `<youtube/loom link>` _(record with the script below)_     |
| Repo                      | this repository                                            |
| Canonical integration map | [`INTEGRATIONS.md`](INTEGRATIONS.md)                       |
| Star Vaults design        | [`STAR_STAKING.md`](STAR_STAKING.md)                       |

## Deployed contracts (Circle Arc testnet · chainId 5042002)

Deployer + attestor: `0x554F991D030aDF539CBD2ff3D896951C6f089804` (deploy via `scripts/deploy-arc.sh`). Addresses below are **deterministic** (fresh deployer, nonce 0) and are already wired into the live app + local `.env`; they go on-chain the moment the deployer is funded with ~0.5 Arc USDC and `deploy-arc.sh` broadcasts.

| Contract                 | Address (deterministic)                      | Role                                                          |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| `EsmsToken` (UUPS proxy) | `0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F` | Soulbound elemental essence (Spirit/Essence/Matter/Substance) |
| `StarVault`              | `0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6` | USDC custody per star + visibility-attested ESMS yield        |
| `ConstellationDeed`      | `0x6B4EE164320e9E5583C0F6BEe14D5BABb5ba5095` | LP-position NFT for zone pools                                |
| `ConstellationAMM`       | `0x34d860Cb460ecD2595584138d22Ad6fe7DAeA3BB` | 6 ESMS element-pair pools, aspect-gated                       |
| ERC-8004 registry (Arc)  | `0x8004A818…`                                | Agent identity / reputation                                   |

> Contracts: `contracts/src/` — `forge test` → **93/93 passing** (39 on `StarVault.sol`: pro-rata custody, no cross-staker loss, and every attestation failure mode + fuzz tests).

## Bounty map (what we built → how to verify)

| Bounty                      | What we built                                                                                                                                                                                 | Verify                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Circle / Arc**            | Single-chain x402 USDC on Arc — self-settle EIP-3009 (`LocalArcFacilitator`) or Circle's facilitator. **Pentacle Star Vaults** stake USDC + mint ESMS yield on Arc. ERC-8004 register on Arc. | `forge test`; `/pentacles`; deploy tx on Arc explorer                            |
| **ENS**                     | Gasless `*.alchmagents.eth` subnames (NameStone) + ENSIP-25/26 records incl. custom `agent-memory`, `human-verified`, `agent-wallet[x402]`. ERC-7930 encoder is byte-exact to spec.           | `bun run scripts/register-all-agents-ens.ts --set historical --dry-run`          |
| **A2A** (AAIF/Google)       | One server, per-agent card at `/a2a/{id}/.well-known/agent-card.json`, `message/send` + incremental `message/stream` (SSE). x402-gated.                                                       | `python backend/smoke_test_a2a.py` → card 200 + 7 SSE token events               |
| **Google Cloud — BigQuery** | Reputation leaderboard over the **mainnet** ERC-8004 registry: partition-pruned SQL generator + indexer + ranking UI.                                                                         | open `/erc8004`                                                                  |
| **Walrus + Sui**            | Encrypted persona memory (MemWal) with no-wallet HTTP fallback; blobId → ENS `agent-memory`.                                                                                                  | `bun run scripts/snapshot-persona-walrus.ts --agent plato` (live testnet blobId) |
| **World** (ID + AgentKit)   | World ID proof-of-personhood gate + `human-verified` ENS/A2A badge; AgentKit proof-of-human for x402.                                                                                         | World ID button → badge written to ENS record                                    |
| **1inch**                   | Fusion+ quote (swap → USDC on Base) + CCTP V2 bridge → Arc.                                                                                                                                   | onramp flow in app                                                               |
| **Tool Router**             | Agent-chat registered as a paid MCP tool (parameterized manifest).                                                                                                                            | manifest generation                                                              |

Status legend and per-file paths: [`INTEGRATIONS.md`](INTEGRATIONS.md).

## The flagship: Pentacle Star Vaults

Stake USDC on individual **stars**; earn **ESMS** elemental essence at a rate set by the live
sky — **but only while the star is risen above your horizon**. A pentagram inscribed in a circle
divides the disk into exactly **11 zones**; each zone hosts aspect-driven ESMS liquidity pools on
`ConstellationAMM`. Yield is multiplicative:

```
dailyRate = BASE × zoneDominance × chartAffinity × planetDignity × visible
```

All inputs come from data the app already produces: live ephemeris, the staker's natal chart, and
the star's `ra`/`dec`. Custody + settlement on Arc; accrual driven by the live SpacetimeDB sky
engine. UI: **`/pentacles`**.

## Demo script (5 minutes)

1. **Discover** — `register-all-agents-ens.ts --dry-run` → `plato.alchmagents.eth` with ENSIP records (`agent-endpoint[a2a]`, `human-verified`).
2. **Serve + stream** — `python backend/smoke_test_a2a.py` → A2A card 200 + 7 SSE token events.
3. **Pay on Arc** — `message/send` → 402 → pay → EIP-3009 self-settled on Arc → reply.
4. **Memory** — `snapshot-persona-walrus.ts --agent plato` → real Walrus testnet blobId.
5. **Rank** — `/erc8004` → BigQuery leaderboard of x402-payable, reputation-ranked agents.
6. **Stars** — `/pentacles` → 11 live zones, real stars by horizon position, per-star APY; connect wallet on Arc → **stake** USDC → **claim** to mint ESMS (only while the star is risen).

## Run it locally

```bash
bun install
bun dev            # → http://localhost:3000/pentacles
cd contracts && forge test     # 93/93
```

Deploy contracts to Arc: fill `contracts/.env` (see `contracts/.env.example`) then `bash scripts/deploy-arc.sh`.
