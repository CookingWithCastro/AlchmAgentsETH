'use client'

import React, { useState } from 'react'
import { JING_MOVES, type JingMoveName } from '@/lib/agents/duel/jing-rules'
import { PLANETS, type Planet } from '@/lib/agents/planetary-traits'
import { Button } from '@/components/ui/button'
import { Sparkles, Swords, Zap, RefreshCw, Trophy, ShieldAlert } from 'lucide-react'

export function JingWordDuelClash() {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet>('Sun')
  const [openingMove, setOpeningMove] = useState<JingMoveName>('Meltdown')
  const [loadingJing, setLoadingJing] = useState(false)
  const [jingResult, setJingResult] = useState<{
    move: string
    voice: string
    element: string
    timestamp: string
  } | null>(null)

  // Word Duel interactive solver test state
  const [rackInput, setRackInput] = useState('A E I L O S T')
  const [candidateWords, setCandidateWords] = useState('SOLAR (14), TOAST (10), LION (8), STAR (9)')
  const [loadingWord, setLoadingWord] = useState(false)
  const [wordResult, setWordResult] = useState<{
    word: string
    rationale: string
    score: number
  } | null>(null)

  const handleCastJing = async () => {
    setLoadingJing(true)
    setJingResult(null)
    try {
      const res = await fetch('/api/agents/jing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet: selectedPlanet,
          opening: openingMove,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setJingResult({
          move: data.move,
          voice: data.voice,
          element: data.element,
          timestamp: data.timestamp,
        })
      }
    } catch (err) {
      console.error('Jing move error:', err)
    } finally {
      setLoadingJing(false)
    }
  }

  const handlePlayWordDuel = async () => {
    setLoadingWord(true)
    setWordResult(null)
    try {
      // Parse candidates from input string
      const parsedCandidates = candidateWords
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(entry => {
          const match = entry.match(/^([A-Za-z]+)(?:\s*\(([0-9]+)\))?$/)
          if (match) {
            return { word: match[1].toUpperCase(), score: match[2] ? parseInt(match[2], 10) : 10 }
          }
          return entry.toUpperCase()
        })

      const res = await fetch('/api/agents/word-duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet: selectedPlanet,
          rack: rackInput.replace(/\s+/g, '').toUpperCase(),
          candidates: parsedCandidates,
        }),
      })
      const data = await res.json()
      if (data.success && data.move) {
        setWordResult({
          word: data.move.word,
          rationale: data.move.rationale || 'Selected by celestial resonance.',
          score: data.move.score || 10,
        })
      }
    } catch (err) {
      console.error('Word duel error:', err)
    } finally {
      setLoadingWord(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-spirit-violet/15 border border-spirit-violet/30 text-st-primary text-xs font-mono uppercase tracking-widest">
          <Swords className="w-3.5 h-3.5" /> Agent Minigame Brain Sandbox
        </div>
        <h2 className="text-3xl font-bold font-headline tracking-tight text-white">
          Jing Elemental Clash & Word Duels of the Spheres
        </h2>
        <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
          Challenge planetary agents directly. Test live elemental counter-moves and lexical word
          plays powered by the multi-provider LLM fallback chain.
        </p>
      </div>

      {/* Sphere Selection */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <label className="block text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
          Select Planetary Champion
        </label>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {PLANETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPlanet(p)}
              className={`p-3 rounded-xl border text-center font-mono text-xs transition-all ${
                selectedPlanet === p
                  ? 'bg-spirit-violet/30 border-st-primary text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] font-bold'
                  : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Jing Elemental Counter-Clash */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Jing Elemental Clash</h3>
              <p className="text-xs text-zinc-400">
                Play an opening elemental technique; the agent counters on the 5-element graph with
                voice.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
            5-Element Graph
          </span>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-mono uppercase text-zinc-300">
            Your Opening Move:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {JING_MOVES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setOpeningMove(m)}
                className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  openingMove === m
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                    : 'bg-black/20 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <span className="font-bold text-sm text-amber-300">{m}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleCastJing}
            disabled={loadingJing}
            className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
          >
            {loadingJing ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Cast Move Against {selectedPlanet}
          </Button>

          {jingResult && (
            <div className="mt-4 p-5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Trophy className="w-4 h-4 text-amber-400" /> {selectedPlanet}&apos;s Counter
                  Move:
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/30 uppercase text-amber-300">
                  {jingResult.move} ({jingResult.element})
                </span>
              </div>
              <p className="text-sm italic text-purple-100 bg-black/40 p-4 rounded-lg border border-purple-500/20 leading-relaxed">
                &ldquo;{jingResult.voice}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Word Duels of the Spheres */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Word Duels of the Spheres</h3>
              <p className="text-xs text-zinc-400">
                Provide a letter rack & solver candidate words; the agent selects its move in voice.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-purple-400/80 bg-purple-400/10 px-2.5 py-1 rounded-md border border-purple-400/20">
            Lexical Brain
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-300 mb-1">
                Your Letter Rack:
              </label>
              <input
                type="text"
                value={rackInput}
                onChange={e => setRackInput(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-400"
                placeholder="A E I L O S T"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-300 mb-1">
                Solver Candidates (Word (score)):
              </label>
              <input
                type="text"
                value={candidateWords}
                onChange={e => setCandidateWords(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-400"
                placeholder="SOLAR (14), TOAST (10), LION (8)"
              />
            </div>
          </div>

          <Button
            onClick={handlePlayWordDuel}
            disabled={loadingWord}
            variant="outline"
            className="w-full border-purple-500/40 hover:bg-purple-500/20 text-purple-200 font-bold py-3 rounded-xl transition-all"
          >
            {loadingWord ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Swords className="w-4 h-4 mr-2" />
            )}
            Consult {selectedPlanet}&apos;s Word Play
          </Button>

          {wordResult && (
            <div className="mt-4 p-5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Trophy className="w-4 h-4 text-amber-400" /> {selectedPlanet} Played:
                </span>
                <span className="px-3 py-1 rounded bg-amber-900/60 border border-amber-500/30 text-amber-200 font-bold text-sm tracking-widest">
                  {wordResult.word} (+{wordResult.score} pts)
                </span>
              </div>
              <p className="text-sm italic text-amber-100 bg-black/40 p-4 rounded-lg border border-amber-500/20 leading-relaxed">
                &ldquo;{wordResult.rationale}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JingWordDuelClash
