import React from 'react'

export const DEFAULT_AI_DISCLAIMER =
  'Planetary Agent responses and cosmic recipes are synthesized using Large Language Models (LLMs) and real-time astrological transit algorithms. They are provided for culinary inspiration and entertainment only, and do not constitute human medical, nutritional, or professional advice.'

export interface AiDisclaimerProps {
  className?: string
  text?: string
  compact?: boolean
}

export function AiDisclaimer({
  className = '',
  text = DEFAULT_AI_DISCLAIMER,
  compact = false,
}: AiDisclaimerProps) {
  if (compact) {
    return (
      <p className={`text-[10px] text-zinc-400/80 leading-tight italic ${className}`}>⚖️ {text}</p>
    )
  }

  return (
    <div
      className={`p-2.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400/90 leading-relaxed shadow-sm ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚖️</span>
        <div>
          <span className="font-semibold text-zinc-300 mr-1">
            AI & Automated Decision Disclaimer:
          </span>
          <span>{text}</span>
        </div>
      </div>
    </div>
  )
}
