/**
 * Print the STAR_REGISTRY_ROOT for the Arc deploy (DeployStarVault reads it from env).
 *   bun run scripts/compute-star-root.ts
 */

import { REGISTERED_STAR_IDS, starMerkleRoot } from '../lib/staking/star-registry'

const root = starMerkleRoot()
console.log(`registered stars: ${REGISTERED_STAR_IDS.length}`)
console.log(`STAR_REGISTRY_ROOT=${root}`)
