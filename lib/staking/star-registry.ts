/**
 * Star registry — the Merkle commitment of stakeable Hipparcos ids that backs
 * StarVault.starRoot / activateStar. The leaf encoding (StandardMerkleTree, ['uint32'])
 * matches the contract's keccak256(bytes.concat(keccak256(abi.encode(uint32 starId)))).
 *
 * The bright-star catalogue is ALSO admin-activated at deploy (no proof needed); the
 * long tail awakens lazily via {starMerkleProof}. To grow the registry: add ids here,
 * recompute the root (`bun run scripts/compute-star-root.ts`), and call setStarRoot.
 */

import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { FALLBACK_STARS } from './star-catalog'

/** Canonical, deduped, sorted set of stakeable HIP ids committed in starRoot. */
export const REGISTERED_STAR_IDS: number[] = Array.from(
  new Set(FALLBACK_STARS.map(s => s.hipId))
).sort((a, b) => a - b)

let _tree: StandardMerkleTree<[number]> | null = null
function tree(): StandardMerkleTree<[number]> {
  if (!_tree) {
    _tree = StandardMerkleTree.of(
      REGISTERED_STAR_IDS.map(id => [id] as [number]),
      ['uint32']
    )
  }
  return _tree
}

export function isRegisteredStar(hipId: number): boolean {
  return REGISTERED_STAR_IDS.includes(hipId)
}

/** The Merkle root to set as STAR_REGISTRY_ROOT at deploy. */
export function starMerkleRoot(): `0x${string}` {
  return tree().root as `0x${string}`
}

/** Proof that `hipId` is registered, or null if it is not in the set. */
export function starMerkleProof(hipId: number): `0x${string}`[] | null {
  const t = tree()
  for (const [i, v] of t.entries()) {
    if (v[0] === hipId) return t.getProof(i) as `0x${string}`[]
  }
  return null
}
