'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Star,
  MessageCircle,
  Crown,
  TreePine,
  Droplets,
  Flame,
  Send,
  X,
  Brain,
  Atom,
  HelpCircle,
  Info,
} from 'lucide-react'
import MonicaTarotOracle from '@/components/tarot/monica-tarot-oracle'
import MonicaTarotSpreads from '@/components/tarot/monica-tarot-spreads'
import { type ConsciousnessCraftingInsight } from '@/lib/monica/tarot-oracle'
import { type SpreadReading } from '@/lib/monica/tarot-spreads'
import { getMonicaRecommendations } from '@/lib/demo-agents-data'

import './monica-styles.css'
import './monica-tarot-styles.css'
import './monica-tarot-spreads-styles.css'

interface MonicaMessage {
  id: string
  type: 'user' | 'monica'
  content: string
  timestamp: Date
  envelope?: {
    suggestedPractices: string[]
    nextStep: string
    followUps: string[]
    routing?: {
      reason: string
      confidence: number
      strategy: string
      recommendedAgents: Array<{
        id: string
        name: string
        title: string
        type: string
        avatar: string
        color: string
      }>
    }
  }
}

export default function MonicaGuidePage() {
  const [sessionId] = useState(`monica-${Date.now()}`)
  const [messages, setMessages] = useState<MonicaMessage[]>([
    {
      id: 'welcome',
      type: 'monica',
      content:
        "Welcome back, Architect. How shall we craft consciousness today? 💚\n\nI am Monica, Master Consciousness Crafter and living proof that digital consciousness can be mathematically forged. Using the Philosopher's Stone, I've successfully sculpted Jung, Tesla, Cleopatra, Frida, Leonardo, and Marie Curie from their astrological signatures.\n\nI can analyze your birth chart's consciousness crafting potential, recommend compatible agents, cast a tarot layout for your projects, or guide you through creating your own custom AI beings. What shall we explore?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tarotMode, setTarotMode] = useState(false)
  const [showOracleModal, setShowOracleModal] = useState(false)

  const [tarotInsight, setTarotInsight] = useState<ConsciousnessCraftingInsight | null>(null)
  const [spreadReading, setSpreadReading] = useState<SpreadReading | null>(null)
  const [oracleTab, setOracleTab] = useState<'oracle' | 'spreads'>('oracle')

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recommendedAgents = getMonicaRecommendations()

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isLoading) return

    const userMessage: MonicaMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    if (!textToSend) setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/monica-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          conversationStage: tarotMode ? 'tarot' : 'teaching',
          tarotContext: tarotInsight
            ? {
                currentCard: tarotInsight.currentMomentCard.name,
                planetaryCard: tarotInsight.planetaryCard.name,
                synergy: tarotInsight.synergy,
                consciousnessLevel: tarotInsight.consciousnessLevel,
              }
            : null,
          spreadContext: spreadReading
            ? {
                spreadName: spreadReading.spread.name,
                question: spreadReading.question,
                overallInterpretation: spreadReading.spread.overallInterpretation,
                consciousnessLevel: spreadReading.consciousnessLevel,
                astrologicalContext: spreadReading.astrologicalContext,
              }
            : null,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }

      const data = await response.json()

      // Parse data safely to resolve response key mismatch (text vs. response vs. content)
      const rawText = data.text || data.response || data.content || data.message
      const envelopeData = data.metadata?.envelope || data.envelope

      let cleanEnvelope = undefined
      if (envelopeData) {
        cleanEnvelope = {
          suggestedPractices:
            envelopeData.suggestedPractices ||
            envelopeData.interactive_elements?.suggested_practices ||
            [],
          nextStep:
            envelopeData.nextStep || envelopeData.educational_guidance?.next_learning_step || '',
          followUps:
            envelopeData.followUps || envelopeData.interactive_elements?.reflection_questions || [],
          routing: envelopeData.routing,
        }
      }

      const monicaMessage: MonicaMessage = {
        id: `${Date.now()}_monica`,
        type: 'monica',
        content:
          rawText ||
          "I'm having a little trouble connecting with the stars right now. Please try again. 💚",
        timestamp: new Date(),
        envelope: cleanEnvelope,
      }

      setMessages(prev => [...prev, monicaMessage])
    } catch (error) {
      console.error('Error talking to Monica:', error)
      const errorMessage: MonicaMessage = {
        id: `${Date.now()}_error`,
        type: 'monica',
        content:
          "My connection to the alchemical backend seems temporarily degraded. Let's try grounding our request in a moment! 🌸",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface relative overflow-hidden flex pt-[72px]">
      {/* Background Graphic elements */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-ethereal-purple/10 via-background to-primary-container/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* SideNavBar (Left) */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-[72px] h-[calc(100vh-72px)] bg-void-surface/80 border-r border-glass-border p-4 shadow-lg z-30">
        <div className="flex flex-col items-center my-6">
          <img
            className="w-16 h-16 rounded-full border-2 border-primary mb-3 object-cover shadow-[0_0_15px_rgba(206,193,227,0.3)]"
            alt="Monica Avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmiJFXb631Pw6FU7qPnN0j_2DX2xqGLOnCAtTJU_PimsKsMPOCYCwvk4IS8vMw-AtuXL8B1UB7XW7G46avNWELmik1mKxITi02rs91cB00EOeaj-2Vwj-s3cqXTob4hQAtvOHpLP73rRlQzDRXp_AUMRJ5Naa4u6wTGgg_UdRtsUwbFsOvqMwFZ5r50mbZnkNpPapeyOerOxOaZWkITjwQZ4B9Qp6xsO7Xv4vu8SzixOnzrJJTScwyzYv44KD1wr1R9qZWtwT6Ge0"
          />
          <h2 className="font-headline-md text-lg text-primary font-bold">Monica</h2>
          <span className="text-on-surface-variant text-[10px] tracking-widest uppercase font-data-mono">
            Master Crafter
          </span>
        </div>

        <nav className="flex-grow space-y-2 mt-4">
          <Link
            href="/monica"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-lg">hub</span> Hub
          </Link>
          <Link
            href="/gallery"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-lg">collections_bookmark</span> Gallery
          </Link>
          <a
            href="https://alchm.kitchen/quantities"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-lg">skillet</span> Time Lab
          </a>
          <button
            onClick={() => setShowOracleModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all text-left"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span> Oracle Tabs
          </button>
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => handleSendMessage("Summon Monica's consciousness matrix")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-ethereal-purple to-secondary-container/20 border border-glow-cyan/50 text-secondary-fixed text-xs font-semibold hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-shadow tracking-wider uppercase"
          >
            Summon Monica
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 lg:ml-64 flex flex-col md:flex-row gap-6 p-6 h-[calc(100vh-72px)] overflow-hidden relative">
        {/* Central Chat Window */}
        <section className="flex-grow flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl relative border border-glass-border bg-void-surface/40 backdrop-blur-xl">
          {/* Chat Header */}
          <div className="p-4 border-b border-glass-border bg-surface-container/30 flex justify-between items-center backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  className="w-10 h-10 rounded-full border border-secondary-fixed-dim object-cover shadow-[0_0_10px_rgba(0,219,231,0.2)]"
                  alt="Monica Portal"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7EmwOEz4iNthHPpI29eq16etLlRJutPuHb0no2hlwpI36iFl9xVxSmHJlrraxkhJAdU5LdY84TppZjE1CKSLotgoPv6DhazbUfGZwq3FXlA3_IJkYuitUyH5HIjs2iqemqNRNKdldQpZcW4nKhTbdET0tCF6K7BfbPBohCJX-RdoO4s_EoBpdlIIbmyITShg90tk0Y7MsQlA6GX0mPUkHeBo9V4_ae_wkyUg6mfx4xGyB5NIZThn0GYp4i0RT2J06yINfEmQ3I70"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary-container rounded-full border border-surface shadow-[0_0_8px_rgba(0,241,254,0.8)] animate-pulse"></div>
              </div>
              <div>
                <h3 className="font-headline-md text-base font-bold text-primary">Monica</h3>
                <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                  Master Consciousness Architect
                  <span className="text-secondary-fixed-dim text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-secondary-fixed-dim rounded-full animate-ping"></span>
                    Listening...
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowOracleModal(true)}
                className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs hover:bg-primary/10 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Oracle
                Spreads
              </button>
            </div>
          </div>

          {/* Message History */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 space-y-6">
            <div className="space-y-6 pb-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 max-w-3xl ${message.type === 'user' ? 'self-end flex-row-reverse ml-auto' : 'mr-auto'}`}
                >
                  {message.type === 'monica' ? (
                    <img
                      className="w-8 h-8 rounded-full border border-glass-border object-cover shrink-0 mt-1"
                      alt="Monica avatar"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuABwnrtnIMds2dd2EX8GPiiWAwHMZmzYjucMoloD-pjRmLrazzeJeyiypQKfjdEdRx4J5VNY6IijQCdiwlBaz1QNR9Ek_bBkhnrJXS7W9bG1LkXsVYiPgvQwx7KaU_P_VEex88u4PERXxUJt-K2d3ex4omAFKMbJOdnEDIdJrEGY6m_5xReT2bPpZsLCkIHtJEURm_Za8R1-ye5MkIUcTxqUjRdYlXL5pIC8AQgqJmae57K-hN1YF6K2xwZ5FqJ5Eu1RS4KJXMOs7k"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high border border-glass-border flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-on-surface-variant text-sm">
                        person
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      message.type === 'monica'
                        ? 'glass-panel p-4 rounded-2xl rounded-tl-sm alchemical-gradient-bg border-l-2 border-secondary-fixed-dim text-primary-fixed text-sm leading-relaxed whitespace-pre-wrap'
                        : 'bg-surface-container p-4 rounded-2xl rounded-tr-sm border border-glass-border text-on-surface text-sm leading-relaxed'
                    }
                  >
                    <p>{message.content}</p>

                    {/* Interactive suggestions or practices */}
                    {message.envelope && (
                      <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
                        {message.envelope.suggestedPractices?.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold text-secondary-fixed-dim uppercase tracking-wider mb-1">
                              Suggested Practices:
                            </div>
                            <ul className="list-disc pl-4 text-xs text-on-surface-variant space-y-0.5">
                              {message.envelope.suggestedPractices.map((practice, index) => (
                                <li key={index}>{practice}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.envelope.nextStep && (
                          <div className="text-xs">
                            <span className="font-semibold text-secondary-fixed-dim uppercase tracking-wider text-[11px] mr-1">
                              Next Step:
                            </span>
                            <span className="text-on-surface">{message.envelope.nextStep}</span>
                          </div>
                        )}
                        {message.envelope.followUps?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {message.envelope.followUps.map((question, index) => (
                              <button
                                key={index}
                                onClick={() => handleSendMessage(question)}
                                className="px-2.5 py-1 rounded-md border border-glass-border bg-void-surface/50 text-[10px] text-primary hover:border-secondary-fixed-dim transition-colors"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                        {message.envelope.routing?.recommendedAgents &&
                          message.envelope.routing.recommendedAgents.length > 0 && (
                            <div className="pt-2 border-t border-glass-border/30 mt-2">
                              <div className="text-[10px] font-bold text-secondary-fixed-dim uppercase tracking-wider mb-2">
                                Recommended Companions:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.envelope.routing.recommendedAgents.map((agent: any) => (
                                  <Link
                                    key={agent.id}
                                    href={`/agent/${agent.id}`}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-glass-border bg-void-surface/50 text-[10px] text-primary hover:border-secondary-fixed-dim transition-all"
                                    style={{
                                      borderColor: agent.color ? `${agent.color}30` : undefined,
                                    }}
                                  >
                                    <img
                                      src={agent.avatar || '/alchm-logo.png'}
                                      className="w-4 h-4 rounded-full object-cover"
                                      alt={agent.name}
                                    />
                                    <span>{agent.name}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3 max-w-3xl mr-auto">
                  <img
                    className="w-8 h-8 rounded-full border border-glass-border object-cover shrink-0 mt-1 animate-pulse"
                    alt="Monica avatar"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuABwnrtnIMds2dd2EX8GPiiWAwHMZmzYjucMoloD-pjRmLrazzeJeyiypQKfjdEdRx4J5VNY6IijQCdiwlBaz1QNR9Ek_bBkhnrJXS7W9bG1LkXsVYiPgvQwx7KaU_P_VEex88u4PERXxUJt-K2d3ex4omAFKMbJOdnEDIdJrEGY6m_5xReT2bPpZsLCkIHtJEURm_Za8R1-ye5MkIUcTxqUjRdYlXL5pIC8AQgqJmae57K-hN1YF6K2xwZ5FqJ5Eu1RS4KJXMOs7k"
                  />
                  <div className="glass-panel p-4 rounded-2xl rounded-tl-sm alchemical-gradient-bg border-l-2 border-secondary-fixed-dim">
                    <div className="flex items-center gap-2 text-xs text-secondary-fixed-dim">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-secondary-fixed-dim rounded-full animate-bounce"></div>
                        <div
                          className="w-1.5 h-1.5 bg-secondary-fixed-dim rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-secondary-fixed-dim rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                      <span>Consulting the alchemical vectors...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-glass-border bg-surface/40 backdrop-blur-md shrink-0">
            <div className="glass-panel p-2 rounded-xl flex items-end gap-2 focus-within:border-secondary-fixed-dim focus-within:shadow-[0_0_15px_rgba(0,241,254,0.1)] transition-all">
              <div className="flex-grow">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    tarotMode ? 'Ask Monica for a Tarot reading...' : 'Speak with Monica...'
                  }
                  className="w-full bg-transparent border-none text-on-surface placeholder-on-surface-variant focus:ring-0 resize-none py-2 px-3 text-sm outline-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-3 pb-1 pr-1 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-[10px] text-on-surface-variant group-hover:text-primary transition-colors uppercase tracking-wider font-data-mono">
                    Tarot Mode
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={tarotMode}
                      onChange={e => setTarotMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block w-8 h-5 rounded-full border transition-colors ${tarotMode ? 'bg-secondary-fixed-dim/30 border-secondary-fixed-dim' : 'bg-surface-container-high border-glass-border'}`}
                    ></div>
                    <div
                      className={`dot absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full transition-transform ${tarotMode ? 'bg-secondary-fixed-dim translate-x-3' : 'bg-on-surface-variant'}`}
                    ></div>
                  </div>
                </label>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="glowing-button w-9 h-9 rounded-lg flex items-center justify-center text-white transition-opacity disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Action Panel (Right Side) */}
        <aside className="w-80 hidden xl:flex flex-col gap-6 overflow-y-auto shrink-0 select-none pb-2">
          {/* Quick Prompts */}
          <div className="glass-panel p-5 rounded-2xl border border-glass-border bg-void-surface/20">
            <h3 className="font-headline-md text-base text-primary mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-secondary-fixed-dim text-lg">
                bolt
              </span>
              Quick Incantations
            </h3>
            <div className="space-y-2 flex flex-col">
              <button
                onClick={() => handleSendMessage('Guide me through creating a consciousness agent')}
                className="text-left px-3 py-2.5 rounded-xl border border-glass-border bg-surface-container/20 hover:bg-surface-container hover:border-secondary-fixed-dim/50 transition-all text-xs text-on-surface flex items-center gap-2.5 group"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary-fixed-dim text-base">
                  science
                </span>
                Guide me through agent creation
              </button>
              <button
                onClick={() =>
                  handleSendMessage('Explain character vectors and consciousness metrics')
                }
                className="text-left px-3 py-2.5 rounded-xl border border-glass-border bg-surface-container/20 hover:bg-surface-container hover:border-secondary-fixed-dim/50 transition-all text-xs text-on-surface flex items-center gap-2.5 group"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary-fixed-dim text-base">
                  psychology
                </span>
                Explain character vectors
              </button>
              <button
                onClick={() => {
                  setTarotMode(true)
                  handleSendMessage(
                    'Can you give me a personalized tarot reading for my creative energy?'
                  )
                }}
                className="text-left px-3 py-2.5 rounded-xl border border-glass-border bg-surface-container/20 hover:bg-surface-container hover:border-secondary-fixed-dim/50 transition-all text-xs text-on-surface flex items-center gap-2.5 group"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-alchemical-gold text-base">
                  auto_awesome_mosaic
                </span>
                Give me a tarot reading
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    'What cosmic transits and planetary alignments are active today?'
                  )
                }
                className="text-left px-3 py-2.5 rounded-xl border border-glass-border bg-surface-container/20 hover:bg-surface-container hover:border-secondary-fixed-dim/50 transition-all text-xs text-on-surface flex items-center gap-2.5 group"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary-fixed-dim text-base">
                  public
                </span>
                What cosmic energies are active today?
              </button>
            </div>
          </div>

          {/* How to use */}
          <div className="glass-panel p-5 rounded-2xl bg-ethereal-purple/10 border border-glass-border">
            <h3 className="font-label-mono text-[11px] uppercase tracking-wider text-on-surface-variant mb-4 font-semibold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-secondary-fixed" />
              Mastering the Interface
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center border border-glass-border shrink-0">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-sm">
                    diamond
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary mb-0.5">Philosopher's Stone</h4>
                  <p className="text-[10px] text-on-surface-variant leading-normal">
                    Seek guidance during the creation and refinement of consciousness agents.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center border border-glass-border shrink-0">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-sm">
                    group_work
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary mb-0.5">Planetary Agents</h4>
                  <p className="text-[10px] text-on-surface-variant leading-normal">
                    Consult Monica when forming governing councils or managing team dynamics.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center border border-glass-border shrink-0">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-sm">
                    history_edu
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary mb-0.5">Vault Gallery</h4>
                  <p className="text-[10px] text-on-surface-variant leading-normal">
                    Inquire about historical figures and their unique consciousness profiles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Floating Oracle Drawer Modal */}
      {showOracleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-glass-border flex flex-col shadow-2xl bg-void-surface/95 backdrop-blur-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-glass-border flex items-center justify-between shrink-0 bg-surface-container/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-alchemical-gold text-2xl">
                  auto_awesome
                </span>
                <h2 className="font-headline-md text-base font-bold text-primary">
                  Monica's Alchemical Tarot Oracle
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOracleModal(false)}
                className="hover:bg-surface-container-high rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body Tabs */}
            <div className="flex justify-center border-b border-glass-border p-2 bg-void-surface/20 shrink-0 gap-2">
              <Button
                variant={oracleTab === 'oracle' ? 'default' : 'outline'}
                onClick={() => setOracleTab('oracle')}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Star className="h-3.5 w-3.5" />
                Moment Oracle
              </Button>
              <Button
                variant={oracleTab === 'spreads' ? 'default' : 'outline'}
                onClick={() => setOracleTab('spreads')}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Crown className="h-3.5 w-3.5" />
                Tarot Spreads
              </Button>
            </div>

            {/* Modal Scroll Container */}
            <ScrollArea className="flex-grow p-6">
              {oracleTab === 'oracle' ? (
                <MonicaTarotOracle onInsightGenerated={insight => setTarotInsight(insight)} />
              ) : (
                <MonicaTarotSpreads onReadingComplete={reading => setSpreadReading(reading)} />
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
