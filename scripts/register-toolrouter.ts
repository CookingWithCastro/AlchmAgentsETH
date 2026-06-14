/**
 * Generate the Tool Router (toolrouter.world) registration manifest + onboarding steps.
 *
 * Tool Router has no self-serve provider API — onboarding is manual + needs a World
 * AgentKit wallet. This prints the manifest to submit and the steps to follow.
 *
 *   bun run scripts/register-toolrouter.ts
 */

import { buildAlchmToolManifest } from '@/lib/toolrouter/manifest'

const manifest = buildAlchmToolManifest()

console.log('=== Tool Router manifest for the Alchm agent-chat tool ===\n')
console.log(JSON.stringify(manifest, null, 2))

console.log(`
=== Onboarding (manual) ===
1. Register an AgentKit wallet in AgentBook (proof-of-human):
     npx @worldcoin/agentkit-cli register <your-agent-wallet>
2. Apply as a provider at https://toolrouter.world (manual onboarding — no self-serve API).
3. Submit the manifest above. Tool Router will health-probe the endpoint
   ${manifest.endpoint} and route + bill calls via AgentKit + x402 (${manifest.payment.network}).
4. External agents then discover + pay-per-call your tool through Tool Router's MCP server
   (toolrouter_list_categories → toolrouter_call_endpoint).

NOTE: our x402-paid A2A endpoint already serves this — Tool Router just makes it
discoverable + billable in the World/x402 ecosystem. It lists TOOLS, not agents, so we
expose one parameterized "chat_with_alchm_agent" tool rather than per-agent listings.
`)
