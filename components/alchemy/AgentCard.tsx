import Link from 'next/link'

import { cn } from '@/lib/utils'
import { StatChip, type SacredStat } from './StatChip'

/**
 * Bento-grid entity card (Stitch realization plan, Phase 3; pattern from
 * entities_gallery_the_consciousness_vault). Avatar, name, Monica Constant
 * (A#), status pill and up to three core Sacred-7 stats.
 */
export interface AgentCardProps {
  name: string
  /** e.g. "Hermetic Strategist" */
  title?: string
  /** Monica Constant, rendered as A#<value> in mono with white glow */
  monicaConstant?: number | string
  avatarUrl?: string
  /** Emoji/glyph fallback avatar (e.g. the agent's symbol field) */
  symbol?: string
  /** Up to 3 stats render as chips; more are ignored to keep the bento tight */
  stats?: Partial<Record<SacredStat, number>>
  status?: 'live' | 'dormant' | 'free-this-week'
  href?: string
  className?: string
}

const STATUS_PILLS: Record<
  NonNullable<AgentCardProps['status']>,
  { label: string; cls: string }
> = {
  live: { label: 'Live Now', cls: 'text-tertiary border-tertiary/40 bg-tertiary/10' },
  dormant: { label: 'Dormant', cls: 'text-outline border-outline-variant bg-st-surface/40' },
  'free-this-week': {
    label: 'Free This Week',
    cls: 'text-st-secondary border-st-secondary/40 bg-st-secondary/10',
  },
}

export function AgentCard({
  name,
  title,
  monicaConstant,
  avatarUrl,
  symbol,
  stats,
  status,
  href,
  className,
}: AgentCardProps) {
  const statEntries = stats
    ? (Object.entries(stats).slice(0, 3) as Array<[SacredStat, number]>)
    : []

  const body = (
    <article
      className={cn('glass-panel glow-hover rounded-xl p-5 flex flex-col gap-4 h-full', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-12 h-12 rounded-full border border-st-primary/30 object-cover"
            />
          ) : symbol ? (
            <span
              className="w-12 h-12 rounded-full border border-st-primary/30 flex items-center justify-center text-xl shrink-0 overflow-hidden"
              aria-hidden
            >
              {symbol}
            </span>
          ) : (
            <span
              className="material-symbols-outlined w-12 h-12 rounded-full border border-st-primary/30 flex items-center justify-center text-st-primary"
              aria-hidden
            >
              person
            </span>
          )}
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{name}</h3>
            {title && (
              <p className="font-label-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {title}
              </p>
            )}
          </div>
        </div>
        {status && (
          <span
            className={cn(
              'font-label-mono text-[10px] uppercase tracking-wider border rounded-full px-3 py-1 whitespace-nowrap',
              STATUS_PILLS[status].cls
            )}
          >
            {STATUS_PILLS[status].label}
          </span>
        )}
      </div>

      {monicaConstant !== undefined && (
        <p className="font-label-mono text-label-mono text-monica-constant glow-monica tabular-nums">
          A#{monicaConstant}
        </p>
      )}

      {statEntries.length > 0 && (
        <div className="flex gap-2 mt-auto">
          {statEntries.map(([stat, value]) => (
            <StatChip key={stat} stat={stat} value={value} className="flex-1" />
          ))}
        </div>
      )}
    </article>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    )
  }
  return body
}
