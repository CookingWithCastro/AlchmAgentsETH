/**
 * Register an agent wallet in World AgentKit's AgentBook (proof-of-human).
 * Registration is via the AgentKit CLI; this prints the commands.
 *
 *   bun run scripts/register-agentkit.ts <agent-wallet-address>
 */

const wallet = process.argv[2] ?? process.env.AGENTKIT_WALLET_ADDRESS ?? '<your-agent-wallet>'

console.log('World AgentKit — AgentBook registration (proof-of-human)\n')
console.log('1. Register (one-time, gasless):')
console.log(`     npx @worldcoin/agentkit-cli register ${wallet}\n`)
console.log('2. Check status:')
console.log(`     npx @worldcoin/agentkit-cli status ${wallet}\n`)
console.log(
  'Once registered, server-side `resolveAgentHuman(wallet)` (lib/worldid/agentkit.ts)\n' +
    'resolves the verified human behind the agent, and x402 endpoints can meter per human\n' +
    '(default policy: 3 free uses, then $0.01 USDC).'
)
