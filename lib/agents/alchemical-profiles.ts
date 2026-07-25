// Alchemical profiles for historical agents
// These represent the intrinsic elemental balance of each figure

import {
  calculateKalchm as calculateCanonicalKalchm,
  type KalchmAxes,
} from '@/lib/thermodynamics/kalchm'

export type AlchemicalProfile = KalchmAxes

export const HISTORICAL_ALCHEMICAL_PROFILES: Record<string, AlchemicalProfile> = {
  'leonardo-da-vinci': { spirit: 6, essence: 8, matter: 7, substance: 4 },
  'william-shakespeare': { spirit: 7, essence: 9, matter: 5, substance: 3 },
  'albert-einstein': { spirit: 8, essence: 7, matter: 6, substance: 5 },
  'nikola-tesla': { spirit: 9, essence: 6, matter: 8, substance: 4 },
  'marie-curie': { spirit: 7, essence: 8, matter: 9, substance: 6 },
  cleopatra: { spirit: 5, essence: 7, matter: 6, substance: 8 },
  socrates: { spirit: 6, essence: 9, matter: 4, substance: 5 },
  'carl-jung': { spirit: 7, essence: 8, matter: 5, substance: 6 },
  'marcus-aurelius': { spirit: 6, essence: 7, matter: 5, substance: 8 },
  'benjamin-franklin': { spirit: 8, essence: 6, matter: 7, substance: 5 },
  'isaac-newton': { spirit: 9, essence: 5, matter: 8, substance: 6 },
  confucius: { spirit: 5, essence: 8, matter: 6, substance: 7 },
  plato: { spirit: 7, essence: 8, matter: 5, substance: 6 },
  aristotle: { spirit: 6, essence: 7, matter: 8, substance: 5 },
  'lao-tzu': { spirit: 4, essence: 9, matter: 3, substance: 8 },
  'siddhartha-gautama': { spirit: 3, essence: 9, matter: 2, substance: 9 },
  rumi: { spirit: 5, essence: 9, matter: 4, substance: 7 },
  'hildegard-of-bingen': { spirit: 6, essence: 8, matter: 6, substance: 7 },
}

export const DEFAULT_ALCHEMICAL_PROFILE: AlchemicalProfile = {
  spirit: 4,
  essence: 5,
  matter: 5,
  substance: 4,
}

export function getAgentAlchemicalProperties(agentId: string): AlchemicalProfile {
  return HISTORICAL_ALCHEMICAL_PROFILES[agentId] || DEFAULT_ALCHEMICAL_PROFILE
}

export function calculateKalchm(agentOrProfile: string | AlchemicalProfile): number {
  const profile =
    typeof agentOrProfile === 'string'
      ? getAgentAlchemicalProperties(agentOrProfile)
      : agentOrProfile
  return calculateCanonicalKalchm(profile)
}
