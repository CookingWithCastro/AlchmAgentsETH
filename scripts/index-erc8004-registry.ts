/**
 * Index the ERC-8004 mainnet agent registry from Google BigQuery.
 *
 * Usage (Bun):
 *   bun run scripts/index-erc8004-registry.ts --type leaderboard --limit 25
 *   bun run scripts/index-erc8004-registry.ts --type registrations --dry-run
 *   bun run scripts/index-erc8004-registry.ts --type registrations --sql      # print SQL, no creds needed
 *   bun run scripts/index-erc8004-registry.ts --type metadata --key agentWallet
 *
 * Flags:
 *   --type   registrations | leaderboard | transfers | metadata | uri-updates | validations
 *   --limit  N (default 25)
 *   --agent-id N
 *   --key    metadata key (type=metadata)
 *   --sql    print the generated SQL (with params inlined) and exit — no BigQuery call
 *   --dry-run  estimate bytes scanned instead of executing
 *
 * Env: GOOGLE_CLOUD_PROJECT (or GCP_PROJECT) + ADC creds. Needs @google-cloud/bigquery
 * for live runs (`bun add @google-cloud/bigquery`); `--sql` works without it.
 */

import {
  Erc8004Indexer,
  buildRegisteredQuery,
  buildUriUpdatedQuery,
  buildMetadataSetQuery,
  buildTransferQuery,
  buildNewFeedbackQuery,
  buildValidationResponseQuery,
  renderInlineSql,
  IDENTITY_REGISTRY,
  REPUTATION_REGISTRY,
  VALIDATION_REGISTRY,
  TOPIC0,
  type BigQuerySpec,
} from '@/lib/erc8004'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

const type = arg('type') ?? 'leaderboard'
const limit = Number(arg('limit') ?? 25)
const agentId = arg('agent-id') ? Number(arg('agent-id')) : undefined
const key = arg('key')

function specFor(): BigQuerySpec {
  switch (type) {
    case 'registrations':
      return buildRegisteredQuery({ agentId, limit })
    case 'uri-updates':
      return buildUriUpdatedQuery({ agentId, limit })
    case 'metadata':
      return buildMetadataSetQuery({ agentId, key, limit })
    case 'transfers':
      return buildTransferQuery({ limit })
    case 'feedback':
      return buildNewFeedbackQuery({ agentId, limit })
    case 'validations':
      return buildValidationResponseQuery({ agentId, limit })
    default:
      return buildRegisteredQuery({ limit })
  }
}

async function main() {
  console.log('ERC-8004 registry (Ethereum mainnet singletons):')
  console.log('  IdentityRegistry  ', IDENTITY_REGISTRY)
  console.log('  ReputationRegistry', REPUTATION_REGISTRY)
  console.log('  ValidationRegistry', VALIDATION_REGISTRY)
  console.log('  topic0:', JSON.stringify(TOPIC0, null, 2))
  console.log('')

  // --sql: print generated SQL, no credentials / package needed.
  if (flag('sql')) {
    const spec = specFor()
    console.log(`-- Generated SQL for type=${type}\n`)
    console.log(renderInlineSql(spec))
    console.log('\n-- Named params:', JSON.stringify(spec.params, null, 2))
    return
  }

  const indexer = new Erc8004Indexer()

  if (flag('dry-run')) {
    const cost = await indexer.dryRun(specFor())
    console.log(`Dry run (type=${type}): ${cost.gib} GiB scanned (${cost.bytesProcessed} bytes)`)
    return
  }

  switch (type) {
    case 'leaderboard': {
      const board = await indexer.buildLeaderboard({ limit })
      console.log(`Leaderboard — ${board.length} agents:`)
      for (const e of board) {
        console.log(
          `  #${e.agentId}  ${e.file?.name ?? '(unresolved)'}  ` +
            `x402=${e.prizeEligible}  score=${e.score.toFixed(1)}  ` +
            `feedback=${e.avgFeedback?.toFixed(1) ?? '—'}(${e.feedbackCount})  ` +
            `validation=${e.validationPassRate != null ? Math.round(e.validationPassRate * 100) + '%' : '—'}(${e.validationCount})  ` +
            `trust=[${e.supportedTrust.join(',')}]`
        )
      }
      break
    }
    case 'feedback': {
      const fb = await indexer.getFeedback({ agentId, limit })
      console.log(`Feedback — ${fb.length}:`)
      for (const f of fb)
        console.log(
          `  #${f.agentId}  rating=${f.normValue}  tag1=${f.tag1 ?? ''}  client=${f.client}`
        )
      break
    }
    case 'validations': {
      const vs = await indexer.getValidationResponses({ agentId, limit })
      console.log(`Validation responses — ${vs.length}:`)
      for (const v of vs)
        console.log(`  #${v.agentId}  response=${v.response}  validator=${v.validator}`)
      break
    }
    case 'registrations': {
      const regs = await indexer.getRegistrations({ agentId, limit })
      console.log(`Registrations — ${regs.length}:`)
      for (const r of regs)
        console.log(`  #${r.agentId}  ${r.agentURI}  owner=${r.owner}  (${r.timestamp})`)
      break
    }
    case 'transfers': {
      const xs = await indexer.getTransfers({ limit })
      for (const t of xs)
        console.log(`  token #${t.tokenId}  ${t.from} → ${t.to}  (${t.timestamp})`)
      break
    }
    case 'metadata': {
      const md = await indexer.getMetadata({ agentId, key, limit })
      for (const m of md)
        console.log(`  #${m.agentId}  key=${m.key}  value=${m.valueUtf8 ?? m.value}`)
      break
    }
    default:
      console.log(`Unknown --type "${type}". Use --sql to inspect a generated query.`)
  }
}

main().catch(err => {
  console.error('index-erc8004-registry failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
