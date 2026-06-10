import { cn } from '@/lib/utils'

/**
 * Sacred Seven stat chip (Stitch realization plan, Phase 3).
 * Data-dense chip: alchemical icon + stat name + value, colored per stat.
 * Values render in JetBrains Mono per the "Quantified Mystery" principle.
 */

export type SacredStat =
  | 'power'
  | 'resonance'
  | 'wisdom'
  | 'charisma'
  | 'intuition'
  | 'adaptability'
  | 'vitality'

interface StatStyle {
  icon: string
  text: string
  bar: string
}

const STAT_STYLES: Record<SacredStat, StatStyle> = {
  power: { icon: 'local_fire_department', text: 'text-error', bar: 'bg-error' },
  resonance: { icon: 'graphic_eq', text: 'text-resonance-blue', bar: 'bg-resonance-blue' },
  wisdom: { icon: 'psychology', text: 'text-st-secondary', bar: 'bg-st-secondary' },
  charisma: {
    icon: 'auto_awesome',
    text: 'text-secondary-container',
    bar: 'bg-secondary-container',
  },
  intuition: { icon: 'visibility', text: 'text-spirit-violet', bar: 'bg-spirit-violet' },
  adaptability: { icon: 'air', text: 'text-st-primary', bar: 'bg-st-primary' },
  vitality: { icon: 'ecg_heart', text: 'text-tertiary', bar: 'bg-tertiary' },
}

export interface StatChipProps {
  stat: SacredStat
  /** 0–100 */
  value: number
  /** Render the horizontal momentum bar under the value */
  showBar?: boolean
  className?: string
}

export function StatChip({ stat, value, showBar = false, className }: StatChipProps) {
  const style = STAT_STYLES[stat]
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      className={cn('glass-panel rounded-lg px-3 py-2 flex flex-col gap-1 min-w-[88px]', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('material-symbols-outlined text-[18px]', style.text)} aria-hidden>
          {style.icon}
        </span>
        <span className="font-label-mono text-label-mono text-on-surface tabular-nums">
          {clamped}
        </span>
      </div>
      <span className="font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
        {stat}
      </span>
      {showBar && (
        <div className="progress-bar-bg w-full">
          <div className={cn('progress-bar-fill', style.bar)} style={{ width: `${clamped}%` }} />
        </div>
      )}
    </div>
  )
}
