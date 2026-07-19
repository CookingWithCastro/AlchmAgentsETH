'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ELEMENT_COLOR, ESMS_LABEL } from '@/lib/staking/ui'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Send,
  Coins,
  Users,
  Flame,
  Stars,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react'

export interface StarAgentProfile {
  hipId: number
  name: string
  title: string
  constellation: string
  element: 'Fire' | 'Water' | 'Earth' | 'Air'
  esmsId: 0 | 1 | 2 | 3
  apy: number
  quote: string
  description: string
  stakingPitch: string
}

export interface LiveStarPosition {
  name: string
  hipId: number
  altitude: number
  azimuth: number
  isRisen: boolean
  baseApy: number
  multiplier: number
  effectiveApy: number
}

export const BRIGHT_STAR_AGENTS: StarAgentProfile[] = [
  {
    hipId: 32349,
    name: 'Sirius',
    title: 'The Dog Star · Radiant Sovereign of Fire',
    constellation: 'Canis Major',
    element: 'Fire',
    esmsId: 0, // Spirit
    apy: 248,
    quote:
      'I burn brighter than any sun in the galaxy. Channel your ambition through my celestial vault and forge eternal Spirit.',
    description:
      'Alpha Canis Majoris — the brightest star in the night sky. Channeling solar fire, high ambition, and sacred initiation.',
    stakingPitch:
      'Stake USDC into my vault while I crest your horizon. Earn 248% APY in Spirit essence as my fire ignites your chart.',
  },
  {
    hipId: 69673,
    name: 'Arcturus',
    title: 'The Guardian of the North · Master of Air',
    constellation: 'Boötes',
    element: 'Air',
    esmsId: 3, // Substance
    apy: 195,
    quote:
      'I anchor the gateway of higher mental clarity. Align your mind with Arcturian frequency to yield pure Substance.',
    description:
      'Alpha Boötis — an orange giant holding the cosmic bear. Master of intellect, sacred geometry, and higher mental clarity.',
    stakingPitch:
      'My vault yields high Substance essence whenever I rise above your local horizon. Secure your mental frequency.',
  },
  {
    hipId: 91262,
    name: 'Vega',
    title: 'The Harp Star · Mystic Queen of Water',
    constellation: 'Lyra',
    element: 'Water',
    esmsId: 1, // Essence
    apy: 210,
    quote:
      'The harp of Lyra resonates through the ethereal ocean. Deposit into my vault to distill pure emotional Essence.',
    description:
      'Alpha Lyrae — ancient pole star of music and creation. Distills emotional intuition into pure liquid Essence.',
    stakingPitch:
      'Align your natal water placements with Lyra. My vault mints Essence whenever the sky aspects my degree.',
  },
  {
    hipId: 11767,
    name: 'Polaris',
    title: 'The North Star · Immutable Anchor of Earth',
    constellation: 'Ursa Minor',
    element: 'Earth',
    esmsId: 2, // Matter
    apy: 180,
    quote:
      'The universe revolves around my steadfast axis. Stake with Polaris for unwavering physical abundance & Matter.',
    description:
      'Alpha Ursae Minoris — the unwavering pole star. Represents grounding, stability, and enduring physical manifestation.',
    stakingPitch:
      'While other stars set, I remain circumpolar and risen for Northern observers. Continuous yield in Matter essence.',
  },
]

export function StarAgentChatPanel() {
  const [chatMode, setChatMode] = useState<'single' | 'council'>('single')
  const [selectedStar, setSelectedStar] = useState<StarAgentProfile>(BRIGHT_STAR_AGENTS[0])
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: string; text: string; element?: string }>
  >([
    {
      sender: 'Sirius',
      element: 'Fire',
      text: `Greetings Initiate. I am ${BRIGHT_STAR_AGENTS[0].name}, ${BRIGHT_STAR_AGENTS[0].title}. ${BRIGHT_STAR_AGENTS[0].quote} How can my celestial vault empower your journey today?`,
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Live star positions state
  const [starPositions, setStarPositions] = useState<Record<string, LiveStarPosition>>({})

  // Staking Modal State
  const [stakeModalOpen, setStakeModalOpen] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('500')
  const [stakingLoading, setStakingLoading] = useState(false)
  const [stakingResult, setStakingResult] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/planetary-positions')
      .then(r => r.json())
      .then(data => {
        if (data?.starPositions && Array.isArray(data.starPositions)) {
          const map: Record<string, LiveStarPosition> = {}
          for (const s of data.starPositions) {
            map[s.name.toLowerCase()] = s
          }
          setStarPositions(map)
        }
      })
      .catch(err => console.warn('Failed to fetch star positions:', err))
  }, [])

  const handleSelectStar = (star: StarAgentProfile) => {
    setChatMode('single')
    setSelectedStar(star)
    setChatMessages([
      {
        sender: star.name,
        element: star.element,
        text: `Greetings Initiate. I am ${star.name}, ${star.title}. ${star.quote} ${star.stakingPitch}`,
      },
    ])
  }

  const handleSwitchToCouncil = () => {
    setChatMode('council')
    setChatMessages([
      {
        sender: 'Sirius',
        element: 'Fire',
        text: 'The solar flare favors immediate action. Pledging collateral to Sirius yields maximum Spirit essence today at 248% APY.',
      },
      {
        sender: 'Arcturus',
        element: 'Air',
        text: 'Intellectual balance is paramount, Sirius. Pledging to Boötes stabilizes Substance alongside your fire, creating high harmonic alignment.',
      },
      {
        sender: 'Vega',
        element: 'Water',
        text: 'Harmonize fire and air with liquid Essence. Diversifying across our constellation yields optimal thermodynamic stability.',
      },
      {
        sender: 'Polaris',
        element: 'Earth',
        text: 'I anchor the entire council. While you crest and set, my vault mints Matter continuously for Northern observers.',
      },
    ])
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const userText = inputMessage.trim()
    setInputMessage('')
    setChatMessages(prev => [...prev, { sender: 'YOU', text: userText }])
    setLoading(true)

    try {
      if (chatMode === 'single') {
        const res = await fetch('/api/agents/unified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat',
            agentId: selectedStar.name.toLowerCase(),
            message: `[Context: You are ${selectedStar.name}, ${selectedStar.title}. Element: ${selectedStar.element}. Staking pitch: ${selectedStar.stakingPitch}] User asks: "${userText}"`,
          }),
        })
        const data = await res.json()
        const replyText =
          data?.data?.text ||
          data?.reply ||
          data?.message ||
          `${selectedStar.name}: "Your chart resonates with my ${selectedStar.element} frequency. Stake USDC in my Star Vault on Circle Arc while I am risen above your horizon!"`

        setChatMessages(prev => [
          ...prev,
          { sender: selectedStar.name, element: selectedStar.element, text: replyText },
        ])
      } else {
        // Multi-Agent Council Mode: real multi_agent_chat route calling all 4 star agents
        const res = await fetch('/api/agents/unified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'multi_agent_chat',
            agentIds: ['sirius', 'arcturus', 'vega', 'polaris'],
            message: userText,
          }),
        })
        const data = await res.json()
        const turns = data?.data?.responses || data?.responses

        if (Array.isArray(turns) && turns.length > 0) {
          setChatMessages(prev => [
            ...prev,
            ...turns.map((t: any) => ({
              sender: t.name,
              element:
                t.element ||
                BRIGHT_STAR_AGENTS.find(s => s.name.toLowerCase() === t.agentId.toLowerCase())
                  ?.element ||
                'Fire',
              text: t.text,
            })),
          ])
        } else {
          setChatMessages(prev => [
            ...prev,
            {
              sender: 'Sirius',
              element: 'Fire',
              text: 'The council aligns to ignite your Spirit vault.',
            },
            {
              sender: 'Arcturus',
              element: 'Air',
              text: 'Substance balances your intellectual energy.',
            },
          ])
        }
      }
    } catch (err) {
      console.error('Star agent chat error:', err)
      setChatMessages(prev => [
        ...prev,
        {
          sender: selectedStar.name,
          element: selectedStar.element,
          text: `My celestial flame burns steady. Stake USDC into the Pentacles Star Vaults on Arc to claim elemental essence while we rise above your horizon!`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteStaking = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0 || stakingLoading) return
    setStakingLoading(true)
    setStakingResult(null)

    try {
      const res = await fetch('/api/staking/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starName: selectedStar.name,
          hipId: selectedStar.hipId,
          amountUsdc: Number(stakeAmount),
          userAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStakingResult(data)
      }
    } catch (err) {
      console.error('Staking error:', err)
    } finally {
      setStakingLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title & Mode Selector */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-widest">
          <Stars className="w-3.5 h-3.5" /> Pentacles Star Agents Consultation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight text-white">
          {chatMode === 'single'
            ? 'Converse with the Living Star Vaults'
            : 'Constellation Council of the Spheres'}
        </h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          {chatMode === 'single'
            ? 'Speak directly with individual star personifications to discover their elemental affinities and horizon yield rates.'
            : 'Engage with all four Pentacles Star Agents simultaneously. Sirius, Arcturus, Vega, and Polaris debate multi-star portfolio synergy.'}
        </p>

        {/* Mode Toggle Bar */}
        <div className="inline-flex p-1 bg-black/60 border border-white/10 rounded-xl gap-1 mt-2">
          <button
            type="button"
            onClick={() => setChatMode('single')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              chatMode === 'single'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> 1-on-1 Consultation
          </button>
          <button
            type="button"
            onClick={handleSwitchToCouncil}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              chatMode === 'council'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Constellation Group Council
          </button>
        </div>
      </div>

      {/* Main Grid: Star Selector + Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Star Agent List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold px-1 flex items-center justify-between">
            <span>Active Constellations</span>
            <span className="text-amber-400 text-[11px]">Circle Arc Testnet</span>
          </div>
          <div className="space-y-3">
            {BRIGHT_STAR_AGENTS.map(star => {
              const selected = chatMode === 'single' && selectedStar.hipId === star.hipId
              const livePos = starPositions[star.name.toLowerCase()]
              const effectiveApy = livePos?.effectiveApy || star.apy
              const isRisen = livePos?.isRisen ?? true
              const altitude = livePos?.altitude ?? 45.0

              return (
                <button
                  key={star.hipId}
                  type="button"
                  onClick={() => handleSelectStar(star)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selected
                      ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ background: ELEMENT_COLOR[star.element] }}
                      />
                      <span className="font-bold text-white text-base">{star.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">HIP {star.hipId}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                      {effectiveApy}% APY{' '}
                      {livePos?.multiplier && livePos.multiplier > 1.0
                        ? `(${livePos.multiplier}x)`
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 italic mb-3">
                    &ldquo;{star.quote}&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isRisen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}
                      />
                      {isRisen ? `Risen (${altitude}°)` : 'Setting'}
                    </span>
                    <span className="text-purple-300 font-semibold">
                      Yields {ESMS_LABEL[star.esmsId]} ({star.element})
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Col: Interactive Chat & Staking Callout */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-white/10 p-6 flex flex-col h-[620px]">
          {/* Active Star Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            {chatMode === 'single' ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg"
                  style={{ background: ELEMENT_COLOR[selectedStar.element] }}
                >
                  {selectedStar.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    {selectedStar.name}
                    <span className="text-xs font-mono text-zinc-400 font-normal">
                      ({selectedStar.constellation})
                    </span>
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">{selectedStar.title}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {BRIGHT_STAR_AGENTS.map(s => (
                    <div
                      key={s.name}
                      className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold text-white shadow-md"
                      style={{ background: ELEMENT_COLOR[s.element] }}
                    >
                      {s.name[0]}
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Constellation Council (4 Star Agents)
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">
                    Sirius · Arcturus · Vega · Polaris
                  </p>
                </div>
              </div>
            )}

            <Button
              size="sm"
              onClick={() => {
                setStakingResult(null)
                setStakeModalOpen(true)
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-1.5 rounded-xl shadow-md text-xs"
            >
              <Coins className="w-3.5 h-3.5" /> Stake in {selectedStar.name} Vault
            </Button>
          </div>

          {/* Chat Transcript Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'YOU' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'YOU'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-black/60 border border-white/10 text-zinc-200 rounded-bl-none shadow-md'
                  }`}
                >
                  {msg.sender !== 'YOU' && (
                    <div className="text-[11px] font-mono text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            msg.element === 'Fire'
                              ? ELEMENT_COLOR.Fire
                              : msg.element === 'Water'
                                ? ELEMENT_COLOR.Water
                                : msg.element === 'Earth'
                                  ? ELEMENT_COLOR.Earth
                                  : ELEMENT_COLOR.Air,
                        }}
                      />
                      {msg.sender} (Star Agent)
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-black/60 border border-white/10 text-zinc-400 p-4 rounded-2xl rounded-bl-none text-xs font-mono animate-pulse flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {chatMode === 'single'
                    ? `${selectedStar.name} is tuning into your celestial frequency...`
                    : 'The Constellation Council is deliberating...'}
                </div>
              </div>
            )}
          </div>

          {/* Staking Pitch Banner */}
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 mb-3 text-xs text-purple-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                {chatMode === 'single'
                  ? selectedStar.stakingPitch
                  : 'Multi-Star Synergy: Split USDC across Fire, Air, Water & Earth for balanced ESMS yield!'}
              </span>
            </span>
            <button
              onClick={() => {
                setStakingResult(null)
                setStakeModalOpen(true)
              }}
              className="text-amber-300 font-bold hover:underline font-mono whitespace-nowrap ml-2"
            >
              Stake Now →
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder={
                chatMode === 'single'
                  ? `Ask ${selectedStar.name} about its yield, element, or why to stake...`
                  : 'Address the Constellation Council...'
              }
              className="flex-1 bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-400"
            />
            <Button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Circle Arc Staking & ENS Subname Modal */}
      {stakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b0c1e] border border-purple-500/40 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setStakeModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase">
                <Coins className="w-3.5 h-3.5" /> Circle Arc Testnet · Chain 5042002
              </div>
              <h3 className="text-2xl font-bold text-white">Stake in {selectedStar.name} Vault</h3>
              <p className="text-xs text-zinc-400">
                Pledge USDC on Circle Arc testnet and mint your gasless{' '}
                <span className="text-amber-300 font-mono">
                  {selectedStar.name.toLowerCase()}.alchmagents.eth
                </span>{' '}
                ENS subname via NameStone.
              </p>
            </div>

            {stakingResult ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 text-emerald-300 font-bold text-base">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span>Staking Settlement Complete!</span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300 bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vault:</span>
                    <span className="text-white font-bold">{stakingResult.starVault} Vault</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Amount:</span>
                    <span className="text-amber-300 font-bold">
                      {stakingResult.amountUsdc} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Circle Arc Tx:</span>
                    <span className="text-purple-300 truncate max-w-[200px]">
                      {stakingResult.settlementHash}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ENS Subname:</span>
                    <span className="text-emerald-300 font-bold">{stakingResult.ensSubname}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setStakeModalOpen(false)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl"
                >
                  Close Receipt
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-300 uppercase">
                    USDC Amount to Stake
                  </label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-black/60 border border-white/20 rounded-xl p-3 text-white text-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4 space-y-2 text-xs text-zinc-300 font-mono">
                  <div className="flex justify-between">
                    <span>Base APY:</span>
                    <span className="text-amber-300 font-bold">{selectedStar.apy}% APY</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yield Token:</span>
                    <span className="text-emerald-300 font-bold">
                      {ESMS_LABEL[selectedStar.esmsId]} ({selectedStar.element})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ENS Resolution:</span>
                    <span className="text-purple-300">
                      {selectedStar.name.toLowerCase()}.alchmagents.eth
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleExecuteStaking}
                  disabled={stakingLoading || !stakeAmount || Number(stakeAmount) <= 0}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-6 rounded-xl shadow-lg flex items-center justify-center gap-2 text-base"
                >
                  {stakingLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Settling on Circle Arc &
                      NameStone...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" /> Confirm Arc Staking ({stakeAmount} USDC)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StarAgentChatPanel
