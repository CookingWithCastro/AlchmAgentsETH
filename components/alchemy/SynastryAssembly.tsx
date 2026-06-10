'use client'

import { useState } from 'react'

import { LiveVaultGallery } from './LiveVaultGallery'
import { AlchemicalButton } from './AlchemicalButton'
import { useOccultStore, type OccultAgentRef } from '@/lib/store/occult-store'
import { cn } from '@/lib/utils'

/**
 * Synastry Assembly (Stitch realization plan, Phase 5, Module 3).
 * Select two REAL agents for astrometric resonance testing. The pairing
 * lives in the occult store so the Duel tab picks it up.
 */

function slotCard(agent: OccultAgentRef | null, label: string, active: boolean) {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col items-center text-center min-h-[150px] justify-center transition-all',
        active && 'premium-glow',
        agent && !active && 'ghost-border-violet'
      )}
    >
      <p className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </p>
      {agent ? (
        <>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">{agent.name}</h3>
          {typeof agent.monicaConstant === 'number' && (
            <p className="font-label-mono text-label-mono text-monica-constant glow-monica mt-1 tabular-nums">
              A#{agent.monicaConstant.toFixed(3)}
            </p>
          )}
        </>
      ) : (
        <p className="font-body-md text-body-md text-outline">
          {active ? 'Choose from the Vault below' : 'Empty well'}
        </p>
      )}
    </div>
  )
}

export function SynastryAssembly({ onCommence }: { onCommence: () => void }) {
  const { caster, target, setCaster, setTarget } = useOccultStore()
  const [assigning, setAssigning] = useState<'caster' | 'target'>('caster')

  const resonance =
    typeof caster?.monicaConstant === 'number' && typeof target?.monicaConstant === 'number'
      ? Math.max(0, 1 - Math.abs(caster.monicaConstant - target.monicaConstant) / 7)
      : null

  const handleSelect = (agent: OccultAgentRef) => {
    if (assigning === 'caster') {
      setCaster(agent)
      setAssigning('target')
    } else {
      setTarget(agent)
    }
  }

  return (
    <div className="min-h-screen bg-st-background pb-24">
      <header className="px-margin-mobile md:px-margin-desktop pt-12 max-w-container-max mx-auto">
        <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background">
          Synastry Assembly
        </h1>
        <p className="font-label-mono text-label-mono text-on-surface-variant mt-3 uppercase">
          Select dual entities for astrometric resonance testing.
        </p>
      </header>

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-8 grid md:grid-cols-3 gap-gutter items-stretch">
        <button type="button" className="text-left" onClick={() => setAssigning('caster')}>
          {slotCard(caster, 'Caster', assigning === 'caster')}
        </button>

        {/* Resonance vector */}
        <div className="glass-float rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">
            Resonance Vector
          </p>
          {resonance !== null ? (
            <>
              <p className="font-headline-lg text-headline-lg text-monica-constant glow-monica tabular-nums">
                {(resonance * 100).toFixed(1)}%
              </p>
              <p
                className={cn(
                  'font-label-mono text-label-mono mt-1',
                  resonance > 0.6 ? 'text-tertiary' : 'text-error'
                )}
              >
                {resonance > 0.6 ? 'Aligned' : 'High Volatility'}
              </p>
            </>
          ) : (
            <p className="font-body-md text-body-md text-outline">Awaiting both entities…</p>
          )}
          <AlchemicalButton className="mt-5" disabled={!caster || !target} onClick={onCommence}>
            Commence Jing Duel
          </AlchemicalButton>
        </div>

        <button type="button" className="text-left" onClick={() => setAssigning('target')}>
          {slotCard(target, 'Target', assigning === 'target')}
        </button>
      </div>

      <div className="mt-4">
        <p className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto font-label-mono text-[11px] uppercase tracking-widest text-outline">
          Assigning: {assigning === 'caster' ? 'Caster (left well)' : 'Target (right well)'} — pick
          below. Historical minds carry the richest personas in the duel.
        </p>
        <LiveVaultGallery selectable onSelect={handleSelect} />
      </div>
    </div>
  )
}
