import { cn } from '@/lib/utils'

/**
 * Horizontal trajectory/progress indicator (Stitch realization plan, Phase 3).
 * Wraps the prototype .progress-bar-bg/.progress-bar-fill pattern — the fill
 * glows in its own color via `box-shadow: currentColor`.
 */
export interface ProgressBarProps {
  /** 0–100 */
  value: number
  /** Tailwind color classes for the fill, e.g. "bg-spirit-violet text-spirit-violet" */
  fillClassName?: string
  /** Accessible label describing what is progressing */
  label?: string
  className?: string
}

export function ProgressBar({
  value,
  fillClassName = 'bg-spirit-violet text-spirit-violet',
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('progress-bar-bg w-full', className)}
    >
      <div className={cn('progress-bar-fill', fillClassName)} style={{ width: `${clamped}%` }} />
    </div>
  )
}
