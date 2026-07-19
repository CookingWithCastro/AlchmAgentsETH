/**
 * Provision Coinbase CDP wallets for agents, persist the addresses, and (when
 * NameStone is configured) publish each agent's wallet as its ENS record so x402
 * payers can resolve it from the agent's `*.alchmagents.eth` name.
 *
 * Usage:
 *   bun run scripts/provision-agent-wallets.ts                    # default demo set
 *   bun run scripts/provision-agent-wallets.ts plato archimedes   # specific agent ids
 *
 * Safe when unconfigured: with no CDP_* env vars it reports "not configured" and
 * exits 0 without creating anything. Uses lib/agentkit/cdp (no server-only) so it
 * runs standalone under bun.
 */

import { PrismaClient } from '@prisma/client'
import { provisionCdpAccount, isCdpConfigured, CDP_NETWORK_ID } from '@/lib/agentkit/cdp'
import { registerAgentSubnameOnCreate } from '@/lib/namestone'

const DEFAULT_AGENTS: Array<{ id: string; name: string }> = [
  { id: 'plato', name: 'Plato' },
  { id: 'marcus-aurelius', name: 'Marcus Aurelius' },
  { id: 'cleopatra', name: 'Cleopatra VII' },
  { id: 'leonardo-da-vinci', name: 'Leonardo da Vinci' },
]

async function main() {
  const argv = process.argv.slice(2)
  const agents = argv.length ? argv.map(id => ({ id, name: id })) : DEFAULT_AGENTS

  if (!isCdpConfigured()) {
    console.log(
      'CDP not configured (need CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET).'
    )
    console.log('Nothing provisioned. Set the CDP_* env vars to enable agent wallets.')
    return
  }

  const prisma = new PrismaClient()
  const publishEns = Boolean(process.env.NAMESTONE_API_KEY && process.env.NAMESTONE_DOMAIN)
  console.log(`Provisioning CDP wallets on ${CDP_NETWORK_ID} for ${agents.length} agent(s)…`)
  console.log(publishEns ? '(will also publish ENS records)\n' : '(NameStone off — skipping ENS)\n')

  let ok = 0
  for (const { id, name } of agents) {
    const wallet = await provisionCdpAccount(id)
    if (!wallet) {
      console.log(`  ✗ ${id}: provisioning failed (see logs above)`)
      continue
    }
    ok++
    console.log(`  ✓ ${id}: ${wallet.address}`)

    try {
      await prisma.agent_wallets.upsert({
        where: { agentId: id },
        create: { agentId: id, address: wallet.address, network: wallet.network },
        update: { address: wallet.address, network: wallet.network },
      })
    } catch (e) {
      console.log(
        `      ↳ persist failed (run the agent_wallets migration): ${(e as Error).message}`
      )
    }

    if (publishEns) {
      try {
        await registerAgentSubnameOnCreate(
          { id, name, walletAddress: wallet.address },
          {
            walletAddress: wallet.address,
            // The CDP wallet is the agent's x402 payment wallet — publish it
            // as agent-wallet[x402] (this is what the log line claims).
            paymentAddress: wallet.address,
            paymentChain: wallet.network?.includes('sepolia') ? 'base-sepolia' : 'base',
          }
        )
        console.log('      ↳ published ENS agent-wallet record')
      } catch (e) {
        console.log(`      ↳ ENS publish failed: ${(e as Error).message}`)
      }
    }
  }

  await prisma.$disconnect()
  console.log(`\nDone. ${ok}/${agents.length} wallets ready.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
