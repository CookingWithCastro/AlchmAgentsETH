import { createHash } from 'node:crypto'

import { AAE_SOLANA_PROGRAM_ID, getPersonaCommitmentAddress } from '@/lib/solana/esms'

export interface SolanaAgentMetadata {
  program_id: string
  persona_pda: string
  cluster: 'devnet'
}

export function solanaAgentIdBytes(agentId: string): Uint8Array {
  const normalized = agentId.trim()
  if (!normalized) throw new Error('agentId is required')
  return Uint8Array.from(createHash('sha256').update(normalized, 'utf8').digest())
}

export function buildSolanaAgentMetadata(agentId: string): SolanaAgentMetadata {
  return {
    program_id: AAE_SOLANA_PROGRAM_ID.toBase58(),
    persona_pda: getPersonaCommitmentAddress(solanaAgentIdBytes(agentId)).toBase58(),
    cluster: 'devnet',
  }
}
