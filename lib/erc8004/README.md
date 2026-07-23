# ERC-8004 × Google Cloud BigQuery indexing layer

Indexes the **ERC-8004 "Trustless Agents" registry** (every agent is an ERC-721 NFT)
straight from Google's public Ethereum dataset — no node, no indexer infra. Powers
the agent **ranking app** surface for the Google Cloud prize track.

> ERC-8004 registries are **pre-deployed singletons** on 40+ chains (mainnet
> `0x8004A169…`, Arc testnet `0x8004A818…`). We never deploy our own. BigQuery
> only has **Ethereum mainnet**, so this layer indexes the mainnet registry.

## Files

| File                   | Purpose                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `registry.ts`          | Singleton addresses (mainnet + Arc testnet), ABIs (verbatim v2.0.0), event topic0s, id helpers           |
| `registration-file.ts` | The agent "homepage" JSON (`x402Support` / `active` / `supportedTrust` / `services`) + builder/validator |
| `bigquery-queries.ts`  | **SQL generator** — partition-pruned, SUBSTR/SAFE_CAST decode, named params                              |
| `bigquery-indexer.ts`  | **Node.js indexing service** — runs queries, viem-decodes logs, builds the leaderboard                   |

## Setup

```bash
bun add @google-cloud/bigquery          # lazy-loaded; only needed for live runs
```

Env:

| Var                                       | Purpose                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT` (or `GCP_PROJECT`) | billing/quota project (1 TB/month free)                                    |
| `GOOGLE_APPLICATION_CREDENTIALS`          | path to a service-account JSON (ADC)                                       |
| `IPFS_GATEWAY` (optional)                 | gateway for `ipfs://` registration files (default `https://ipfs.io/ipfs/`) |

## Usage

```bash
# Print generated SQL — no credentials or package needed (great for demos):
bun run scripts/index-erc8004-registry.ts --type registrations --sql

# Cost preview (bytes scanned) before running:
bun run scripts/index-erc8004-registry.ts --type registrations --dry-run

# Live: rank all mainnet agents (resolves registration files, joins reputation):
bun run scripts/index-erc8004-registry.ts --type leaderboard --limit 25
```

```ts
import { Erc8004Indexer, buildRegisteredQuery, renderInlineSql } from '@/lib/erc8004'

const sql = renderInlineSql(buildRegisteredQuery({ limit: 100 })) // inspect/copy-paste
const agents = await new Erc8004Indexer().getRegistrations({ limit: 100 })
const board = await new Erc8004Indexer().buildLeaderboard({ limit: 50 })
```

HTTP: `GET /api/erc8004/registry?type=leaderboard&limit=50` (also `registrations`,
`transfers`, `metadata`, `&dryRun=1`).

## SQL decode rules (per the BigQuery prize slide)

- `address = LOWER(registry)`, `topics[OFFSET(0)] = topic0`, always `block_timestamp >= '2026-01-28'` (partition prune).
- indexed uint → `HEX_TO_INT(SUBSTR(topic, 3))`; indexed address → `CONCAT('0x', SUBSTR(topic, 27))`.
- dynamic string in `data` → `SAFE_CONVERT_BYTES_TO_STRING(FROM_HEX(SUBSTR(...)))`.

## Caveats

- **`MetadataSet` is 4 params** in the deployed contract (`…, string metadataKey, bytes metadataValue`),
  not the 3-param form on the slide. topic0 is derived from the real signature.
- **Reputation / Validation event ABIs are best-effort** — `validationRequest/Response`
  live on a separate **ValidationRegistry** in the repo; confirm the event signatures
  against `erc-8004-contracts` before relying on those queries. The leaderboard
  degrades gracefully if they return nothing.
- `agentId` is the ERC-721 tokenId, assigned from **0**.
