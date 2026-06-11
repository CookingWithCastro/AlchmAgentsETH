'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Send, Heart, Sparkles, Brain, X, Minimize2, Eye } from 'lucide-react'
import { useLiveOracleChat } from '@/lib/spacetime/hooks/useLiveOracleChat'

interface MonicaChatMessage {
  id: string
  type: 'user' | 'monica'
  content: string
  timestamp: Date
  context?: {
    page: string
    guidance?: string
    suggestions?: string[]
  }
  envelope?: {
    suggestedPractices: string[]
    nextStep: string
    followUps: string[]
  }
}

interface MonicaChatBubbleProps {
  pathname: string
  currentMC?: number
  consciousnessLevel?: string
}

function getPageWelcomeMessage(page: string): string {
  const pageMessages: Record<string, string> = {
    '/': "Hello! I'm Monica, your consciousness guide. I can help you craft agents, read tarot, explore astrology, and understand your cosmic nature. What would you like to explore today?",
    '/gallery':
      "Welcome to the Gallery of Perpetuity! Here you'll find 35+ consciousness-crafted agents. I can help you assemble group chats, understand agent personalities, or match you with agents that resonate with your energy.",
    '/planetary-agents':
      'Ah, the planetary realms! I can help you assemble group chats with planetary agents, explore astrological consultations, and understand how celestial energies influence consciousness.',
    '/philosophers-stone':
      "The Philosopher's Stone - my favorite place! I can guide you through agent creation, consciousness crafting, and help you understand the Monica Constant system.",
    'https://alchm.kitchen/quantities':
      'The Time Laboratory is where past, present, and future converge. I can help you navigate temporal explorations and understand how consciousness evolves through time.',
    '/rune-forge':
      'The Rune Forge - where ancient wisdom meets modern technology. I can help you understand sigil creation and the power of symbolic magic.',
    '/monica-guide':
      'My dedicated chat interface! Here we can have deep conversations about consciousness, astrology, tarot, and all aspects of the Planetary Agents system.',
  }
  return (
    pageMessages[page] ||
    "Hello! I'm Monica, your consciousness guide. How can I help you explore this page?"
  )
}

function getPageSuggestions(page: string): string[] {
  const suggestions: Record<string, string[]> = {
    '/': [
      'Explain character vectors',
      'What are A-Numbers?',
      'Tell me about tarot',
      'How do I create an agent?',
    ],
    '/gallery': [
      'Help me find agents for group chat',
      'Explain agent personalities',
      'What agents resonate with me?',
      'How do group chats work?',
    ],
    '/planetary-agents': [
      'Help me assemble a planetary council',
      'What planets influence me?',
      'Astrological consultation',
      'Planetary agent compatibility',
    ],
    '/philosophers-stone': [
      'Guide me through agent creation',
      'Explain Monica Constant',
      'Consciousness crafting tips',
      'Agent personality development',
    ],
    'https://alchm.kitchen/quantities': [
      'Explore temporal patterns',
      'Time-based consciousness',
      'Future consciousness exploration',
      'Historical consciousness analysis',
    ],
    '/rune-forge': [
      'Explain sigil creation',
      'Rune meanings and powers',
      'Personalized sigil guidance',
      'Symbolic magic basics',
    ],
  }
  return (
    suggestions[page] || [
      'Ask me anything!',
      'Get personalized guidance',
      'Explore consciousness',
      'Learn about astrology',
    ]
  )
}

export function MonicaChatBubble({
  pathname,
  currentMC,
  consciousnessLevel,
}: MonicaChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const {
    messages: liveMessages,
    sendMessage: sendLiveMessage,
    isThinking,
    error: subscriptionError,
    status,
  } = useLiveOracleChat()

  const welcomeMessage = useMemo<MonicaChatMessage>(
    () => ({
      id: 'welcome',
      type: 'monica',
      content: getPageWelcomeMessage(pathname),
      timestamp: new Date(),
      context: {
        page: pathname,
        suggestions: getPageSuggestions(pathname),
      },
    }),
    [pathname]
  )
  const messages = useMemo<MonicaChatMessage[]>(
    () => [
      welcomeMessage,
      ...liveMessages.map(message => ({
        id: message.id,
        type: message.role === 'user' ? ('user' as const) : ('monica' as const),
        content: message.text,
        timestamp: message.createdAt,
        context: { page: pathname },
      })),
    ],
    [liveMessages, pathname, welcomeMessage]
  )
  const assistantMessageCount = liveMessages.filter(message => message.role === 'assistant').length
  const previousAssistantCount = useRef(assistantMessageCount)

  useEffect(() => {
    if (assistantMessageCount > previousAssistantCount.current && !isExpanded) {
      setHasUnreadMessages(true)
    }
    previousAssistantCount.current = assistantMessageCount
  }, [assistantMessageCount, isExpanded])

  const handleSendMessage = async () => {
    const text = currentMessage.trim()
    if (!text || isThinking) return

    setCurrentMessage('')
    setSendError(null)

    try {
      await sendLiveMessage(text)
      setHasUnreadMessages(false)
    } catch (error) {
      setCurrentMessage(text)
      setSendError(error instanceof Error ? error.message : 'Unable to send message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const openChat = () => {
    setIsExpanded(true)
    setHasUnreadMessages(false)
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (pathname === '/monica') return null // Don't show on Monica's own page

  return (
    <>
      {/* Chat Bubble - Fixed dimensions to prevent CLS */}
      {!isMinimized && (
        <div className="fixed bottom-4 right-4 z-[100]" style={{ contain: 'layout' }}>
          {isExpanded ? (
            /* Expanded Chat Interface */
            <Card className="w-96 h-[600px] flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-2 border-emerald-400 shadow-2xl">
              <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50/50 via-green-50/50 to-cyan-50/50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 border-b border-emerald-200 dark:border-emerald-800 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-emerald-400 shadow-md">
                        <AvatarImage src="/alchm-logo.png" alt="Monica" />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-green-600 text-white text-sm">
                          ⚗️
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-emerald-500 animate-pulse" />
                        Monica
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-100 dark:bg-emerald-900 border-emerald-300"
                        >
                          <Eye className="w-2.5 h-2.5 mr-1" />
                          {pathname.split('/').pop() || 'home'}
                        </Badge>
                        {currentMC && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-purple-100 dark:bg-purple-900 border-purple-300"
                          >
                            <Sparkles className="w-2.5 h-2.5 mr-1" />
                            {currentMC.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(false)}
                      className="hover:bg-emerald-100 dark:hover:bg-emerald-900"
                      title="Minimize chat"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(true)}
                      className="hover:bg-red-100 dark:hover:bg-red-900"
                      title="Close chat"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col p-0 flex-1 min-h-0 overflow-hidden">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4" style={{ maxHeight: 'calc(600px - 180px)' }}>
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-200 dark:shadow-emerald-900'
                              : 'bg-gradient-to-r from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 border-2 border-emerald-200 dark:border-emerald-800 shadow-emerald-100 dark:shadow-emerald-900/50'
                          }`}
                        >
                          {message.type === 'monica' && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Heart className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                Monica
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                          )}

                          <p
                            className={`text-sm leading-relaxed ${message.type === 'monica' ? 'text-emerald-900 dark:text-emerald-100' : 'text-white'}`}
                          >
                            {message.content}
                          </p>

                          {message.envelope && (
                            <div className="mt-3 space-y-2">
                              {message.envelope.suggestedPractices.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    Suggested Practices
                                  </div>
                                  <ul className="list-disc pl-4 text-xs text-emerald-800 dark:text-emerald-200">
                                    {message.envelope.suggestedPractices.map((p, i) => (
                                      <li key={i}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {message.envelope.nextStep && (
                                <div className="text-xs">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                    Next Step:
                                  </span>
                                  <span className="ml-1 text-emerald-800 dark:text-emerald-200">
                                    {message.envelope.nextStep}
                                  </span>
                                </div>
                              )}
                              {message.envelope.followUps?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {message.envelope.followUps.map((q, i) => (
                                    <Button
                                      key={i}
                                      size="sm"
                                      variant="outline"
                                      className="text-xs cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900"
                                      onClick={() => setCurrentMessage(q)}
                                    >
                                      {q}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {message.type === 'user' && (
                            <div className="text-xs text-white/70 mt-2">
                              {formatTimestamp(message.timestamp)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {(sendError || subscriptionError) && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                          {sendError || subscriptionError}
                        </div>
                      </div>
                    )}

                    {status !== 'connected' && (
                      <div className="flex justify-start">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/50">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-300">
                              Connecting to the live oracle...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isThinking && (
                      <div className="flex justify-start">
                        <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-300">
                              Monica is thinking...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-emerald-200 dark:border-emerald-800 shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={e => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        status === 'connected'
                          ? 'Ask Monica anything...'
                          : 'Connecting to Monica...'
                      }
                      className="flex-1 border-emerald-300 focus:border-emerald-500"
                      disabled={isThinking || status !== 'connected'}
                    />
                    <Button
                      onClick={handleSendMessage}
                      aria-label="Send message"
                      disabled={!currentMessage.trim() || isThinking || status !== 'connected'}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Quick Suggestions */}
                  {messages.length <= 1 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {getPageSuggestions(pathname)
                        .slice(0, 3)
                        .map((suggestion, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => setCurrentMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Collapsed Chat Bubble */
            <div className="relative group">
              <Button
                onClick={openChat}
                aria-label="Open Monica chat"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg hover:shadow-emerald-400/50 hover:scale-110 transition-all duration-300"
              >
                <MessageCircle className="w-6 h-6 text-white" />
                {hasUnreadMessages && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                )}
              </Button>

              {/* Enhanced Hover Tooltip - Fixed positioning */}
              <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[110]">
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-900 via-green-900 to-cyan-900 text-emerald-100 text-sm rounded-lg shadow-2xl border border-emerald-400/50 backdrop-blur-sm min-w-[280px] max-w-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-semibold text-emerald-100">Chat with Monica</span>
                  </div>
                  <div className="text-emerald-200 text-xs mb-2">
                    Your consciousness guide is here to help!
                  </div>
                  {currentMC && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-purple-900/50 border-purple-400/50 text-purple-200"
                      >
                        MC {currentMC.toFixed(2)}
                      </Badge>
                      {consciousnessLevel && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-900/50 border-emerald-400/50 text-emerald-200"
                        >
                          {consciousnessLevel}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-emerald-300 border-t border-emerald-700 pt-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Click to chat • Page: {pathname.split('/').pop() || 'home'}</span>
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full right-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-emerald-900"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimized Indicator */}
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => {
              setIsMinimized(false)
              openChat()
            }}
            variant="outline"
            size="sm"
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-emerald-400 text-emerald-700 dark:text-emerald-300"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Monica
            {hasUnreadMessages && (
              <div className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </div>
      )}
    </>
  )
}
