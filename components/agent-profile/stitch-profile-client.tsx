'use client'

import React, { useEffect, useState, useRef } from 'react'

interface StitchProfileClientProps {
  monicaConstant: number
  dominantElement: string
  actions: any[]
  interactions: any[]
}

export function StitchProfileClient({
  monicaConstant,
  dominantElement,
  actions = [],
  interactions = [],
}: StitchProfileClientProps) {
  const [clockTime, setClockTime] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [stars, setStars] = useState<React.CSSProperties[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

  // Generate the decorative starfield only after mount. Math.random() at render
  // time differs between SSR and the client, which triggers a hydration mismatch;
  // deferring to a client-only effect keeps the server HTML empty and stable.
  useEffect(() => {
    setStars(
      Array.from({ length: 60 }).map(() => ({
        width: `${Math.random() * 2 + 0.5}px`,
        height: `${Math.random() * 2 + 0.5}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `twinkle ${Math.random() * 4 + 2}s infinite ease-in-out`,
      }))
    )
  }, [])

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClockTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Generate scrolling alchemical telemetry logs
  useEffect(() => {
    // Only claims backed by real data (props) — no fabricated integration status.
    const defaultLogs = [
      `SYSTEM: Initializing cognitive telemetry stream...`,
      `RESOLVED: Dominant elemental affinity => ${dominantElement.toUpperCase()}`,
      `CALCULATED: Monica Constant calibrated to ${monicaConstant.toFixed(2)}/10.00`,
      `COGNITION: Processing astral transits for natal alignment...`,
    ]

    // Map real actions/interactions if available, otherwise fallback
    const activityLogs =
      actions.length > 0
        ? actions.map(act => {
            const time = new Date(act.createdAt || act.timestamp || Date.now()).toLocaleTimeString(
              'en-US',
              {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              }
            )
            return `[${time}] ACTION: ${act.description || act.type || 'Agent state evaluation'}`
          })
        : []

    const interactionLogs =
      interactions.length > 0
        ? interactions.map(inter => {
            const time = new Date(
              inter.createdAt || inter.timestamp || Date.now()
            ).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })
            return `[${time}] INTERACTION: Council discussion or user message exchange`
          })
        : []

    const combined = [...defaultLogs, ...activityLogs, ...interactionLogs]

    // Animate logs rendering like a terminal
    let currentIdx = 0
    const interval = setInterval(() => {
      if (currentIdx < combined.length) {
        setLogs(prev => [...prev, combined[currentIdx]])
        currentIdx++
      } else {
        // Ambient decorative ticks — phrased as ambience, never as claims about
        // integrations or persistence that aren't actually running.
        const ticks = [
          `TICK: Orbit transit aspect adjusted (+0.03°)`,
          `COGNITION: Re-weighing elemental resonance`,
          `CALCULUS: Vector resonance rectified`,
        ]
        const randomTick = ticks[Math.floor(Math.random() * ticks.length)]
        const time = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        setLogs(prev => [...prev.slice(-30), `[${time}] ${randomTick}`])
      }
    }, 1200)

    return () => clearInterval(interval)
  }, [actions, interactions, monicaConstant, dominantElement])

  // Scroll to bottom of terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Radial chart calculations
  const radius = 40
  const circumference = 2 * Math.PI * radius // 251.3
  const progressPercent = Math.min(100, Math.max(0, (monicaConstant / 10) * 100))
  const strokeOffset = circumference - (circumference * progressPercent) / 100

  return (
    <>
      {/* Dynamic Starfield Background */}
      <div className="starfield fixed inset-0 z-0 pointer-events-none overflow-hidden bg-radial-gradient">
        {stars.map((style, i) => (
          <div key={i} className="star absolute bg-white rounded-full opacity-25" style={style} />
        ))}
      </div>

      {/* Clock and Active Status for Hero */}
      <div className="absolute top-6 right-6 hidden md:flex items-center gap-md font-mono-label text-mono-label text-bright-gold bg-black/40 px-3 py-1.5 rounded border border-border-gold/30 z-20">
        <span className="w-2 h-2 rounded-full bg-primary-gold animate-pulse"></span>
        <span>CHANNEL ACTIVE</span>
        <span className="text-muted-text">|</span>
        <span>{clockTime}</span>
      </div>

      {/* Renders circular Monica Constant radial chart */}
      <div className="flex flex-col items-center justify-center py-sm">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full chart-svg -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-[#1c1f2c] stroke-current"
              strokeWidth="6"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
            <circle
              className="text-primary-gold stroke-current transition-all duration-1000 ease-out"
              strokeWidth="6"
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-mono-data text-4xl text-bright-gold font-bold">
              {monicaConstant.toFixed(2)}
            </span>
            <span className="text-[9px] font-mono-label text-muted-text uppercase tracking-wider mt-1">
              MONICA CONSTANT
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Logs Panel */}
      <div className="flex-grow flex flex-col h-[280px]">
        <div className="flex justify-between items-center px-4 py-2 bg-[#0b0e19] border-b border-border-gold/30">
          <span className="font-mono-label text-[10px] text-primary-gold uppercase tracking-wider">
            Telemetry Feed
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-gold animate-ping"></span>
        </div>
        <div
          ref={terminalRef}
          className="flex-grow p-4 bg-[#0b0e19]/90 font-mono-data text-[11px] text-primary-gold/90 space-y-1.5 overflow-y-auto overflow-x-hidden leading-relaxed custom-scrollbar h-[230px]"
        >
          {logs.map((log, i) => (
            <div key={i} className="truncate select-text">
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="animate-pulse">Loading telemetry log streams...</div>
          )}
        </div>
      </div>
    </>
  )
}
