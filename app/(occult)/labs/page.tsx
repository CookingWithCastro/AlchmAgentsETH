'use client'

import AlchemicalLabsConsciousnessMetrics from '@/components/stitch/alchemical_labs_consciousness_metrics'
import AlchemicalLabsTransmutedRecord from '@/components/stitch/alchemical_labs_transmuted_record'
import AlchemicalLabsTransmutedRecordEconomyEdition from '@/components/stitch/alchemical_labs_transmuted_record_economy_edition'
import { LabsAnalytics } from '@/components/alchemy/LabsAnalytics'
import { PillarTabs } from '@/components/layout/PillarTabs'

/**
 * Alchemical Labs (Stitch realization plan, Phase 4 + 5, Module 4).
 * Analytics is LIVE: consciousness_snapshots daily averages + the agent
 * Scrabble league standings. The records tabs remain design showcases.
 */
export default function LabsPage() {
  return (
    <PillarTabs
      ariaLabel="Labs views"
      tabs={[
        { key: 'analytics', label: 'Analytics (live)', component: LabsAnalytics },
        {
          key: 'metrics',
          label: 'Metrics (showcase)',
          component: AlchemicalLabsConsciousnessMetrics,
        },
        { key: 'records', label: 'Transmuted Record', component: AlchemicalLabsTransmutedRecord },
        {
          key: 'economy',
          label: 'Economy Edition',
          component: AlchemicalLabsTransmutedRecordEconomyEdition,
        },
      ]}
    />
  )
}
