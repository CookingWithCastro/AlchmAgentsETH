/**
 * Batch-register all agents as gasless ENS subnames under the parent domain via
 * NameStone (e.g. plato.alchmagents.eth, planetary-sun-aries-0.alchmagents.eth).
 *
 * Usage (Bun):
 *   bun run scripts/register-all-agents-ens.ts --set historical --dry-run
 *   bun run scripts/register-all-agents-ens.ts --set historical
 *   bun run scripts/register-all-agents-ens.ts --set all --address 0xYourTeamWallet
 *
 * Flags:
 *   --set historical | planetary | all   (default: historical)
 *   --address 0x...   address every subname resolves to (default: NAMESTONE_DEFAULT_ADDRESS)
 *   --domain x.eth    parent domain (default: NAMESTONE_DOMAIN)
 *   --limit N         cap the number of agents (useful for a first run)
 *   --dry-run         print what would be sent; no API calls
 *
 * Env: NAMESTONE_API_KEY, NAMESTONE_DOMAIN, NAMESTONE_DEFAULT_ADDRESS, NEXT_PUBLIC_SITE_URL.
 *
 * NOTE: per-agent wallets (Privy/Dynamic) can replace the shared --address once
 * they exist — set `resolveAddress` to read each agent's wallet. Today historical/
 * planetary agents have no per-agent wallet, so they share the team address.
 */

import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { ensLabel, buildAgentTextRecords } from '@/lib/erc8004/ensip'
import { bulkSetSubnames, type NameStoneSubname } from '@/lib/namestone'

const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]
const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

const set = arg('set') ?? 'historical'
const limit = arg('limit') ? Number(arg('limit')) : undefined
const domain = arg('domain') ?? process.env.NAMESTONE_DOMAIN
const address = arg('address') ?? process.env.NAMESTONE_DEFAULT_ADDRESS
const dryRun = flag('dry-run')

const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
const a2aBase = process.env.A2A_PUBLIC_URL?.replace(/\/$/, '')

interface AgentSeed {
  label: string
  name: string
}

function historicalSeeds(): AgentSeed[] {
  return HISTORICAL_AGENTS.map((a: { id: string; name?: string }) => ({
    label: ensLabel(a.id),
    name: a.name ?? a.id,
  }))
}

function planetarySeeds(): AgentSeed[] {
  const out: AgentSeed[] = []
  for (const planet of PLANETS) {
    for (const sign of SIGNS) {
      for (let degree = 0; degree < 30; degree++) {
        const id = `planetary-${planet}-${sign}-${degree}`
        out.push({ label: id, name: `${planet} in ${sign} ${degree}°` })
      }
    }
  }
  return out
}

function seeds(): AgentSeed[] {
  const all =
    set === 'planetary'
      ? planetarySeeds()
      : set === 'all'
        ? [...historicalSeeds(), ...planetarySeeds()]
        : historicalSeeds()
  return limit ? all.slice(0, limit) : all
}

function toSubname(seed: AgentSeed): NameStoneSubname {
  return {
    name: seed.label,
    address,
    text_records: buildAgentTextRecords({
      context: `${seed.name} — an Alchm agent.`,
      a2aUrl: a2aBase ? `${a2aBase}/a2a/${seed.label}` : undefined,
      webUrl: site ? `${site}/agents/${seed.label}` : undefined,
      paymentAddress: address,
      paymentChain: 'eip155:84532', // Base Sepolia CAIP-2 chain ID
    }),
  }
}

async function main() {
  const list = seeds()
  console.log(
    `Set: ${set} · agents: ${list.length} · domain: ${domain ?? '(unset)'} · address: ${address ?? '(unset)'}`
  )

  if (!domain) throw new Error('NAMESTONE_DOMAIN (or --domain) is required')
  if (!address && !dryRun)
    throw new Error('NAMESTONE_DEFAULT_ADDRESS (or --address) is required for live runs')

  const subnames = list.map(toSubname)

  if (dryRun) {
    console.log('\n--dry-run — first 5 subnames that would be sent:')
    for (const s of subnames.slice(0, 5)) {
      console.log(`  ${s.name}.${domain} -> ${s.address ?? '(no address)'}`)
      console.log(`    text_records: ${JSON.stringify(s.text_records)}`)
    }
    console.log(
      `\nWould send ${subnames.length} subnames in ${Math.ceil(subnames.length / 50)} batches (50/req).`
    )
    return
  }

  const result = await bulkSetSubnames(subnames, {
    domain,
    onBatch: (i, total, processed) => console.log(`  batch ${i}/${total} — ${processed} processed`),
  })
  console.log(
    `\n✓ Registered ${result.processed} subnames in ${result.batches} batches under ${domain}.`
  )
}

main().catch(err => {
  console.error('register-all-agents-ens failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
