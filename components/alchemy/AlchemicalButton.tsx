import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Techno-Occult button (Stitch realization plan, Phase 3 / DESIGN.md):
 * - primary ("Transmutation"): spirit-violet fill, celestial-gold glow on hover
 * - secondary ("Attunement"): transparent + violet border, gold border on hover
 * - premium: gold fill + gold glow, for paid/locked actions
 * Text is JetBrains Mono, uppercase, per the prototype CTAs.
 */
export interface AlchemicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'premium'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANT_CLASSES: Record<NonNullable<AlchemicalButtonProps['variant']>, string> = {
  primary: 'bg-spirit-violet text-monica-constant hover:shadow-[0_0_15px_rgba(255,224,131,0.4)]',
  secondary:
    'bg-transparent border border-spirit-violet text-st-primary hover:border-st-secondary hover:text-st-secondary hover:shadow-[inset_0_0_10px_rgba(255,224,131,0.1)]',
  premium:
    'bg-secondary-container text-on-secondary-container hover:shadow-[0_0_20px_rgba(238,194,0,0.5)]',
}

const SIZE_CLASSES: Record<NonNullable<AlchemicalButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-[12px]',
  md: 'px-6 py-3 text-label-mono',
  lg: 'px-8 py-4 text-label-mono',
}

export const AlchemicalButton = forwardRef<HTMLButtonElement, AlchemicalButtonProps>(
  function AlchemicalButton(
    { variant = 'primary', size = 'md', className, type = 'button', ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'font-label-mono uppercase tracking-wider rounded-full inline-flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    )
  }
)
