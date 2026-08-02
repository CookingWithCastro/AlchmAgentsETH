import React from 'react'

export interface AiGeneratedPillProps {
  className?: string
  text?: string
}

export function AiGeneratedPill({
  className = '',
  text = '✦ AI Generated Content · Planetary Agent Persona',
}: AiGeneratedPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30 backdrop-blur-md shadow-sm select-none ${className}`}
      title="Synthesized using LLM and planetary transits"
    >
      <span className="text-amber-300 text-[10px]">✦</span>
      <span>{text}</span>
    </span>
  )
}
