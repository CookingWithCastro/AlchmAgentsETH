/**
 * Register one agent on-chain in the ERC-8004 IdentityRegistry, then (optionally)
 * write its ENSIP-25 verification record via NameStone — the full identity loop.
 *
 * Usage (Bun):
 *   # Preview the registration file + data: URI (no signer needed):
 *   bun run scripts/register-agent-onchain.ts --agent plato --dry-run
 *
 *   # Mint on Arc testnet (needs a signer + ARC_TESTNET_CHAIN_ID):
 *   bun run scripts/register-agent-onchain.ts --agent plato --network arcTestnet
 *
 *   # …and write the ENS agent-registration text record after minting:
 *   bun run scripts/register-agent-onchain.ts --agent plato --ens
 *
 * Flags: --agent <slug> (required) · --network mainnet|testnet|arcTestnet (default arcTestnet)
 *        --a2a <url> · --web <url> · --ens (write NameStone record) · --dry-run
 */

import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import {
  registerAgent,
  buildRegistrationFile,
  toDataUri,
  ensLabel,
  buildAgentTextRecords,
  ERC8004_ADDRESSES,
  type Erc8004Network,
} from '@/lib/erc8004'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

const slug = arg('agent')
const network = (arg('network') ?? 'arcTestnet') as Erc8004Network
const a2aUrl = arg('a2a')
const webUrl = arg('web')
const dryRun = flag('dry-run')
const writeEns = flag('ens')

async function main() {
  if (!slug) throw new Error('--agent <slug> is required')

  const agent = HISTORICAL_AGENTS.find(
    (a: { id: string }) => a.id === slug || ensLabel(a.id) === slug
  ) as { id: string; name?: string; title?: string } | undefined
  const name = agent?.name ?? slug
  const label = ensLabel(agent?.id ?? slug)
  const ensName = process.env.NAMESTONE_DOMAIN
    ? `${label}.${process.env.NAMESTONE_DOMAIN}`
    : undefined

  const file = buildRegistrationFile({
    name,
    description: agent?.title ? `${name} — ${agent.title}` : `${name}, an Alchm agent.`,
    ensName,
    a2aCardUrl: a2aUrl,
    webUrl,
    supportedTrust: ['reputation', 'crypto-economic'],
    x402Support: true,
  })

  console.log(`Agent: ${name} (label: ${label}) · network: ${network}`)
  console.log('Registration file:', JSON.stringify(file, null, 2))
  console.log('agentURI (data:):', toDataUri(file).slice(0, 120) + '…')

  if (dryRun) {
    const registry = ERC8004_ADDRESSES[network].identity
    console.log(`\n--dry-run — would call register(agentURI) on ${registry} (${network}).`)
    console.log('After mint, an ENSIP-25 agent-registration[<erc7930>][<agentId>]="1" record')
    console.log(`is written for ${ensName ?? label} (run with --ens).`)
    return
  }

  const result = await registerAgent({ network, file })
  console.log(`\n✓ Registered #${result.agentId} — ${result.globalId}`)
  console.log(`  tx: ${result.txHash}`)

  if (writeEns) {
    if (!process.env.NAMESTONE_API_KEY || !process.env.NAMESTONE_DOMAIN) {
      console.warn('  (skipping ENS write — NAMESTONE_API_KEY / NAMESTONE_DOMAIN not set)')
      return
    }
    const { mergeSetSubname } = await import('@/lib/namestone')
    // merge-write: preserves records other flows already set for this name
    // (agent-memory, human-verified, agent-wallet) while adding registration.
    await mergeSetSubname({
      name: label,
      textRecords: buildAgentTextRecords({
        context: file.description,
        a2aUrl,
        webUrl,
        registration: {
          agentId: result.agentId,
          chainId: result.chainId,
          registry: result.registry,
        },
      }),
    })
    console.log(`  ✓ ENS records set for ${label}.${process.env.NAMESTONE_DOMAIN}`)
  }
}

main().catch(err => {
  console.error('register-agent-onchain failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
