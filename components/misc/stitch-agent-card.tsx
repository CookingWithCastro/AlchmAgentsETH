'use client'

import React from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { CraftedAgent } from '@/lib/agent-types'
import { ELEMENT_METADATA } from '@/lib/element-metadata'

interface StitchAgentCardProps {
  agent: CraftedAgent
  isSelected?: boolean
  onToggleSelection?: (agentId: string) => void
  variant?: 'card' | 'list'
}

export function StitchAgentCard({
  agent,
  isSelected = false,
  onToggleSelection,
  variant = 'card',
}: StitchAgentCardProps) {
  const element = agent.consciousness?.dominantElement || 'Air'
  const meta = ELEMENT_METADATA[element as keyof typeof ELEMENT_METADATA] || ELEMENT_METADATA.Air

  const handleSelect = (e: React.MouseEvent) => {
    if (onToggleSelection) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelection(agent.id)
    }
  }

  // Fallback origin resolution
  const origin = agent.birthLocation?.name || agent.birthData?.location?.name || 'Unknown'

  // Shorten country name if Ulm, Germany -> Ulm, DE
  const displayOrigin = origin
    .replace(', Germany', ', DE')
    .replace(', Italy', ', IT')
    .replace(', Egypt', ', EG')
    .replace(', Mexico', ', MX')
    .replace(', Greece', ', GR')
    .replace(', France', ', FR')
    .replace(', United Kingdom', ', UK')
    .replace(', United States', ', US')

  if (variant === 'list') {
    return (
      <article className="glass-panel p-md flex items-center group relative cursor-pointer hover:border-primary-gold/60 transition-all duration-300 select-none bg-[#12141f]/80 backdrop-blur-xl border border-border-gold/30 rounded w-full">
        {/* Selection Trigger */}
        {onToggleSelection && (
          <button
            onClick={handleSelect}
            className={`w-5 h-5 mr-md rounded border transition-all flex items-center justify-center flex-shrink-0 ${
              isSelected
                ? 'bg-primary-gold border-primary-gold text-on-primary-gold'
                : 'border-border-gold hover:border-primary-gold bg-black/40'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>
        )}

        {/* Link wrapper */}
        <Link
          href={`/agent/${agent.id}`}
          className="flex items-center justify-between flex-grow min-w-0"
        >
          <div className="flex items-center space-x-md min-w-0">
            {/* Tiny Portrait */}
            <div
              className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 ${meta.glow}`}
            >
              <img
                src={agent.appearance?.avatar || '/avatars/default.png'}
                alt={agent.name}
                className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all"
              />
            </div>

            {/* Title & Name */}
            <div className="min-w-0">
              <h3 className="font-headline-md text-base text-bright-gold transition-colors group-hover:text-primary-gold truncate">
                {agent.name}
              </h3>
              <p className="font-mono-label text-[10px] text-muted-text uppercase tracking-wider truncate">
                {agent.title || 'Alchemical Scholar'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-lg text-right flex-shrink-0 ml-md">
            {/* Era & Origin info */}
            <div className="hidden sm:block text-left">
              <div className="text-[9px] uppercase text-muted-text opacity-50 font-eyebrow">
                ERA & ORIGIN
              </div>
              <div className="font-mono-data text-[11px] text-ivory-text">
                {agent.era || agent.historicalEra || 'Modern'} · {displayOrigin}
              </div>
            </div>

            {/* Level */}
            <span className="text-[10px] font-mono-label text-muted-text uppercase flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded border border-border-gold/10">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.bg}`}></span>
              {agent.consciousness?.level || 'Active'}
            </span>

            <span className="material-symbols-outlined text-muted-text group-hover:text-primary-gold group-hover:translate-x-1 transition-all">
              arrow_right_alt
            </span>
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article
      className="glass-panel p-lg flex flex-col items-center group relative cursor-pointer hover:border-primary-gold/60 transition-all duration-500 hover:-translate-y-2 select-none h-full bg-[#12141f]/80 backdrop-blur-2xl border border-border-gold shadow-[0_0_20px_rgba(216,180,106,0.02)]"
      style={{ minHeight: '380px' }}
    >
      {/* Selection Trigger */}
      {onToggleSelection && (
        <button
          onClick={handleSelect}
          className={`absolute top-4 left-4 z-20 w-5 h-5 rounded border transition-all flex items-center justify-center ${
            isSelected
              ? 'bg-primary-gold border-primary-gold text-on-primary-gold'
              : 'border-border-gold hover:border-primary-gold bg-black/40'
          }`}
          aria-label={isSelected ? `Deselect ${agent.name}` : `Select ${agent.name}`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>
      )}

      {/* Main Link Wrapper */}
      <Link href={`/agent/${agent.id}`} className="w-full flex flex-col items-center flex-grow">
        {/* Avatar Area */}
        <div className="relative mb-lg mt-sm">
          <div
            className={`w-32 h-32 rounded-full overflow-hidden border-2 group-hover:scale-105 transition-transform duration-500 ${meta.glow}`}
            style={{
              boxShadow: `0 0 16px -2px ${meta.glowColor}`,
            }}
          >
            <img
              src={agent.appearance?.avatar || '/avatars/default.png'}
              alt={agent.name}
              className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700"
            />
          </div>
          <div
            className={`absolute -bottom-2 right-0 ${meta.bg} text-background text-[10px] px-2 py-0.5 rounded-full font-mono-label font-bold uppercase tracking-wider`}
          >
            {element}
          </div>
        </div>

        {/* Text Details */}
        <div className="text-center w-full flex-grow flex flex-col justify-between">
          <div>
            <h3 className="font-headline-md text-headline-md text-bright-gold mb-xs transition-colors group-hover:text-primary-gold leading-tight">
              {agent.name}
            </h3>
            <p className="font-mono-label text-mono-label text-muted-text uppercase tracking-widest mb-md">
              {agent.title || 'Alchemical Scholar'}
            </p>
          </div>

          <div className="space-y-sm">
            <div className="grid grid-cols-2 gap-sm mb-lg">
              <div className="flex flex-col items-start p-xs bg-surface-container-low/40 border border-border-gold/10 rounded">
                <span className="text-[9px] uppercase text-muted-text opacity-50 font-eyebrow">
                  Era
                </span>
                <span className="font-mono-data text-mono-data text-ivory-text truncate w-full text-left">
                  {agent.era || agent.historicalEra || 'Modern'}
                </span>
              </div>
              <div className="flex flex-col items-start p-xs bg-surface-container-low/40 border border-border-gold/10 rounded">
                <span className="text-[9px] uppercase text-muted-text opacity-50 font-eyebrow">
                  Origin
                </span>
                <span className="font-mono-data text-mono-data text-ivory-text truncate w-full text-left">
                  {displayOrigin}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-md border-t border-border-gold/20">
              <span className="text-[10px] font-mono-label text-muted-text uppercase flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${meta.bg} shadow-[0_0_5px_rgba(255,255,255,0.4)]`}
                ></span>
                {agent.consciousness?.level || 'Active'}
              </span>
              <span className="material-symbols-outlined text-muted-text group-hover:text-primary-gold group-hover:translate-x-1 transition-all duration-300">
                arrow_right_alt
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}
