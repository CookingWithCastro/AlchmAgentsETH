import { forwardRef, useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * Signature input field (Stitch realization plan, Phase 3 / DESIGN.md):
 * dark inset ground, JetBrains Mono micro-label, violet bottom border that
 * blooms into a glow on focus (.input-glow in app/techno-occult.css).
 */
export interface RitualInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Center the value, prototype "Name Your Vessel" style */
  centered?: boolean
}

export const RitualInput = forwardRef<HTMLInputElement, RitualInputProps>(function RitualInput(
  { label, centered = false, className, id, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div
      className={cn(
        'relative input-glow transition-all duration-300 border-b-2 border-surface-variant group bg-surface-container/50 rounded-t-lg',
        className
      )}
    >
      <label
        htmlFor={inputId}
        className="absolute -top-3 left-4 px-1 font-label-mono text-label-mono text-st-primary/70 group-focus-within:text-spirit-violet transition-colors"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-transparent text-on-surface py-4 px-4 border-none focus:ring-0 focus:outline-none placeholder-on-surface-variant/30 font-body-md text-body-md',
          centered && 'text-center font-headline-lg text-headline-lg text-monica-constant py-6'
        )}
        {...props}
      />
    </div>
  )
})
