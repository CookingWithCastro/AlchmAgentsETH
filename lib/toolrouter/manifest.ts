/**
 * Tool Router (toolrouter.world) registration manifest.
 *
 * Tool Router is a hosted MCP tool-router built on World AgentKit + x402 — it lists
 * callable, *paid* tool endpoints, NOT an A2A agent directory. So we expose our agents
 * as ONE parameterized tool ("chat_with_alchm_agent", taking an agentId) backed by our
 * x402-paid endpoint, rather than 3,960 individual listings.
 *
 * Registration is MANUAL onboarding (no self-serve provider API) + an AgentKit wallet.
 * This builder produces the manifest you submit during onboarding; the exact schema
 * is best-effort (confirm with Tool Router during onboarding).
 */

export interface ToolRouterPayment {
  protocol: 'x402'
  /** CAIP-2 network, e.g. eip155:5042002 (Arc) or base-sepolia. */
  network: string
  /** Payment asset (USDC) contract address. */
  asset: string
  /** Price per call in atomic units (e.g. "10000" = $0.01 USDC). */
  price: string
  /** Receiving wallet (AgentKit / operator). */
  payTo?: string
}

export interface ToolRouterToolManifest {
  name: string
  description: string
  /** The x402-paid endpoint Tool Router calls. */
  endpoint: string
  protocol: 'mcp' | 'a2a' | 'http'
  inputSchema: Record<string, unknown>
  payment: ToolRouterPayment
  provider: { name: string; ens?: string; agentWallet?: string }
}

export interface BuildAlchmToolManifestInput {
  /** Public base for the agent endpoints (A2A server / MCP). */
  endpoint?: string
  network?: string
  asset?: string
  price?: string
  payTo?: string
  ens?: string
  agentWallet?: string
}

/** Build the Tool Router manifest for the parameterized Alchm agent-chat tool. */
export function buildAlchmToolManifest(
  input: BuildAlchmToolManifestInput = {}
): ToolRouterToolManifest {
  const endpoint = (
    input.endpoint ??
    process.env.A2A_PUBLIC_URL ??
    'https://api.agents.alchm.kitchen'
  ).replace(/\/$/, '')
  return {
    name: 'chat_with_alchm_agent',
    description:
      'Converse with any Alchm planetary or historical agent (Plato, Marie Curie, …) in their own ' +
      'voice and expertise. Pass an agentId and a message. Paid per call via x402 USDC.',
    endpoint: `${endpoint}/a2a/{agentId}/`,
    protocol: 'a2a',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent slug, e.g. "plato" or "marie-curie".' },
        message: { type: 'string', description: 'The message to send the agent.' },
      },
      required: ['agentId', 'message'],
    },
    payment: {
      protocol: 'x402',
      network: input.network ?? process.env.X402_NETWORK ?? 'eip155:5042002',
      asset: input.asset ?? process.env.X402_ASSET ?? '0x3600000000000000000000000000000000000000',
      price: input.price ?? process.env.X402_PRICE_ATOMIC ?? '10000',
      payTo: input.payTo ?? process.env.X402_PAY_TO,
    },
    provider: {
      name: 'AlchmAgents',
      ens: input.ens ?? process.env.NAMESTONE_DOMAIN ?? 'alchmagents.eth',
      agentWallet: input.agentWallet ?? process.env.AGENTKIT_WALLET_ADDRESS,
    },
  }
}
