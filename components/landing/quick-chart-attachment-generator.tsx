'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Copy,
  Download,
  Check,
  FileText,
  Code,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Layers,
  Compass,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { buildOutput } from '@/lib/context-card/serializers'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import type { ContextCardData, ExportFormat, ExportOptions } from '@/lib/context-card/types'

export interface UserChartProfile {
  id: string
  chartName: string
  birthDate: string
  birthTime: string
  birthLocation: {
    name: string
    lat: number
    lon: number
  }
  isPrimary?: boolean
  data?: ContextCardData
}

const FORMATS: { id: ExportFormat; label: string; ext: string; mime: string }[] = [
  { id: 'md', label: 'Markdown', ext: '.md', mime: 'text/markdown' },
  { id: 'txt', label: 'Plain Text', ext: '.txt', mime: 'text/plain' },
  { id: 'json', label: 'JSON', ext: '.json', mime: 'application/json' },
]

const DEFAULT_OPTS: ExportOptions = {
  promptHeader: true,
  synopsis: true,
  houses: true,
  aspects: true,
  minorAspects: true,
  transits: true,
  alchm: true,
  annotated: false,
}

const OPTION_KEYS: { key: keyof ExportOptions; label: string; desc: string }[] = [
  { key: 'promptHeader', label: 'LLM Prompt Header', desc: 'Adds system guidance for AI' },
  { key: 'transits', label: 'Live Transits', desc: 'Current sky overlay' },
  { key: 'alchm', label: 'Alchm Energy Layer', desc: 'Sacred 7 & ESMS scores' },
  { key: 'synopsis', label: 'Astrological Synopsis', desc: 'Big Three summary' },
  { key: 'aspects', label: 'Major Aspects', desc: 'Planetary relationships' },
  { key: 'houses', label: 'House Cusps', desc: 'Life domains mapping' },
  { key: 'annotated', label: 'Plain-English Notes', desc: 'Descriptive explanations' },
]

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'new york': { lat: 40.7128, lon: -74.006 },
  brooklyn: { lat: 40.6782, lon: -73.9442 },
  manhattan: { lat: 40.7831, lon: -73.9712 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  london: { lat: 51.5074, lon: -0.1278 },
  paris: { lat: 48.8566, lon: 2.3522 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  sydney: { lat: -33.8688, lon: 151.2093 },
  chicago: { lat: 41.8781, lon: -87.6298 },
  miami: { lat: 25.7617, lon: -80.1918 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  austin: { lat: 30.2672, lon: -97.7431 },
  berlin: { lat: 52.52, lon: 13.405 },
  toronto: { lat: 43.6532, lon: -79.3832 },
  rome: { lat: 41.9028, lon: 12.4964 },
  barcelona: { lat: 41.3851, lon: 2.1734 },
  amsterdam: { lat: 52.3676, lon: 4.9041 },
}

function resolveCoordinates(locationStr: string): { lat: number; lon: number } {
  const lower = (locationStr || '').toLowerCase()
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) return coords
  }
  return { lat: 40.7128, lon: -74.006 }
}

const STORAGE_KEY = 'alchm_saved_user_charts'

export function QuickChartAttachmentGenerator() {
  const router = useRouter()
  const [data, setData] = useState<ContextCardData>(DEMO_CARD_DATA)
  const [format, setFormat] = useState<ExportFormat>('md')
  const [opts, setOpts] = useState<ExportOptions>(DEFAULT_OPTS)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [calculating, setCalculating] = useState(false)

  // Chart List Management
  const [charts, setCharts] = useState<UserChartProfile[]>([])
  const [activeChartId, setActiveChartId] = useState<string>('demo')

  // Form State for Adding / Editing Chart Inputs
  const [formName, setFormName] = useState('My Natal Chart')
  const [formDate, setFormDate] = useState('1995-06-21')
  const [formTime, setFormTime] = useState('10:17')
  const [formLocName, setFormLocName] = useState('New York, NY, USA')

  // Initialize and load charts
  useEffect(() => {
    let unmounted = false

    async function initChartContext() {
      let savedLocal: UserChartProfile[] = []
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) savedLocal = JSON.parse(stored)
      } catch (err) {
        console.warn('[QuickChartAttachmentGenerator] Failed to parse local stored charts:', err)
      }

      try {
        const res = await fetch('/api/context-card/generate')
        if (res.ok) {
          const body = await res.json()
          if (body.success && body.data && !unmounted) {
            setData(body.data)
            const serverCharts: UserChartProfile[] = (body.userCharts || []).map((c: any) => ({
              id: c.id || `server_${Date.now()}`,
              chartName: c.chartName || 'Primary Chart',
              birthDate: typeof c.birthDate === 'string' ? c.birthDate.split('T')[0] : '1990-06-01',
              birthTime: c.birthTime || '10:17',
              birthLocation: c.birthLocation || {
                name: 'Brooklyn, NY',
                lat: 40.6782,
                lon: -73.9442,
              },
              isPrimary: c.isPrimary,
              data: body.data,
            }))

            const merged = [...serverCharts]
            savedLocal.forEach(lc => {
              if (!merged.some(mc => mc.id === lc.id || mc.chartName === lc.chartName)) {
                merged.push(lc)
              }
            })

            if (!merged.some(c => c.id === 'demo')) {
              merged.unshift({
                id: 'demo',
                chartName: body.isPrimaryChart ? 'Primary Birth Chart' : 'Reference Chart',
                birthDate: body.data.birth?.date || '1990-06-01',
                birthTime: body.data.birth?.time || '10:17 AM',
                birthLocation: {
                  name: body.data.birth?.place || 'Brooklyn, NY, USA',
                  lat: 40.6782,
                  lon: -73.9442,
                },
                isPrimary: true,
                data: body.data,
              })
            }

            setCharts(merged)
            setActiveChartId(merged[0].id)
            if (body.isPrimaryChart) {
              setShowForm(false)
            }
          }
        }
      } catch (err) {
        console.warn('[QuickChartAttachmentGenerator] Server fetch error:', err)
      }
    }

    initChartContext()
    return () => {
      unmounted = true
    }
  }, [])

  // Switch Active Chart
  const handleSelectChart = (chart: UserChartProfile) => {
    setActiveChartId(chart.id)
    if (chart.data) {
      setData(chart.data)
    } else {
      calculateChartAttachment(chart)
    }
  }

  // Calculate & Save Custom Chart Input
  const calculateChartAttachment = async (customProfile?: Partial<UserChartProfile>) => {
    setCalculating(true)
    const name = customProfile?.chartName || formName || 'Personal Natal Chart'
    const date = customProfile?.birthDate || formDate
    const time = customProfile?.birthTime || formTime
    const locName = customProfile?.birthLocation?.name || formLocName
    const { lat, lon } = customProfile?.birthLocation
      ? { lat: customProfile.birthLocation.lat, lon: customProfile.birthLocation.lon }
      : resolveCoordinates(locName)

    try {
      const res = await fetch('/api/context-card/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartName: name,
          birthDate: date,
          birthTime: time,
          birthLocation: { name: locName, lat, lon },
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          setData(body.data)
          const newChart: UserChartProfile = {
            id: customProfile?.id || `chart_${Date.now()}`,
            chartName: name,
            birthDate: date,
            birthTime: time,
            birthLocation: { name: locName, lat, lon },
            data: body.data,
          }

          setCharts(prev => {
            const updated = prev.filter(c => c.id !== newChart.id)
            updated.push(newChart)
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(updated.filter(c => c.id !== 'demo'))
              )
            } catch {
              /* ignore localStorage write error */
            }
            return updated
          })
          setActiveChartId(newChart.id)
          setShowForm(false)
        }
      }
    } catch (err) {
      console.error('[QuickChartAttachmentGenerator] Calculation failed:', err)
    } finally {
      setCalculating(false)
    }
  }

  // Delete a saved custom chart
  const handleDeleteChart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const filtered = charts.filter(c => c.id !== id)
    setCharts(filtered)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.filter(c => c.id !== 'demo')))
    } catch {}
    if (activeChartId === id && filtered.length > 0) {
      handleSelectChart(filtered[0])
    }
  }

  // Output text string formatting
  const outputText = useMemo(() => {
    return buildOutput(data, format, opts)
  }, [data, format, opts])

  const lineCount = useMemo(() => outputText.split('\n').length, [outputText])
  const charCount = useMemo(() => outputText.length, [outputText])
  const tokenEstimate = useMemo(() => Math.round(charCount / 4), [charCount])

  const toggleOption = (key: keyof ExportOptions) => {
    setOpts(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = outputText
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  const handleDownload = () => {
    const fmtDef = FORMATS.find(f => f.id === format) || FORMATS[0]
    const activeChart = charts.find(c => c.id === activeChartId)
    const slug = (activeChart?.chartName || 'alchm-chart-context')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    const blob = new Blob([outputText], { type: `${fmtDef.mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}${fmtDef.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  const activeChart = charts.find(c => c.id === activeChartId) || charts[0]
  const bigThree = data.birth?.bigThree || { sun: 'Aries', moon: 'Cancer', rising: 'Leo' }

  return (
    <div className="glass-panel rounded-2xl border-[#23262B] p-6 md:p-8 bg-[#0e1015]/90 backdrop-blur-2xl relative overflow-hidden my-6 shadow-2xl">
      {/* Background accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-[#b8fc4b]/10 via-[#7bd1fa]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-[#a855f7]/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23262B] pb-6 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 text-[#b8fc4b] font-mono-label text-[11px] uppercase tracking-widest mb-3">
            <Zap className="w-3.5 h-3.5 text-[#b8fc4b]" /> Any LLM Chat Attachment Generator
          </div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-[#e0e4d2] tracking-tight">
            Personal Chart Context Attachment
          </h2>
          <p className="text-[#8c947c] text-sm mt-1 max-w-2xl">
            Enter your exact birth date, time, and location below to generate a rich chart context
            file (.md, .txt, or .json) ready to attach to ChatGPT, Claude, or any AI chat.
          </p>
        </div>

        {/* Big Three Summary Badge */}
        <div className="flex flex-col items-start md:items-end gap-1 shrink-0 bg-[#16181d] border border-[#23262B] rounded-xl p-3.5 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b8fc4b] animate-pulse" />
            <span className="font-mono-label text-xs text-[#b8fc4b] font-semibold truncate max-w-[160px]">
              {activeChart?.chartName || 'Active Chart'}
            </span>
          </div>
          <div className="text-xs text-[#e0e4d2] font-mono font-bold">
            ☉ {bigThree.sun} · ☽ {bigThree.moon} · ⇡ {bigThree.rising}
          </div>
          <div className="text-[10px] text-[#8c947c] font-mono">
            {data.birth?.place || 'Live Sky Transits Applied'}
          </div>
        </div>
      </div>

      {/* Prominent Callout Banner */}
      <div className="mb-6 bg-gradient-to-r from-[#b8fc4b]/10 via-[#7bd1fa]/10 to-transparent border border-[#b8fc4b]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#b8fc4b]/20 border border-[#b8fc4b]/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#b8fc4b]" />
          </div>
          <div>
            <div className="font-headline-sm text-sm font-bold text-[#e0e4d2]">
              Input your Birth Date, Time & Location below
            </div>
            <div className="text-xs text-[#8c947c]">
              Exact birth time & location are required for accurate Ascendant (Rising sign), house
              cusps, and live transit overlays.
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowForm(prev => !prev)}
          className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] transition-all shrink-0 active:scale-95 shadow-md"
        >
          {showForm ? 'Hide Birth Form' : '✏️ Input Birth Details'}
        </button>
      </div>

      {/* Saved Chart Selection Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-mono-label text-xs uppercase tracking-wider text-[#8c947c] flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#b8fc4b]" /> Select / Switch Active Chart
          </label>

          <button
            onClick={() => setShowForm(prev => !prev)}
            className="py-1.5 px-3 rounded-lg text-xs font-mono text-[#b8fc4b] bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 hover:bg-[#b8fc4b]/20 transition-all flex items-center gap-1.5"
          >
            {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Close Input Form' : '+ Input New Birth Details'}
          </button>
        </div>

        {/* Saved Chart Pills */}
        <div className="flex flex-wrap gap-2">
          {charts.map(c => {
            const active = c.id === activeChartId
            return (
              <div
                key={c.id}
                onClick={() => handleSelectChart(c)}
                className={`py-2 px-3.5 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                  active
                    ? 'bg-[#1d2319] border-[#b8fc4b] text-[#b8fc4b] font-bold shadow-[0_0_15px_rgba(184,252,75,0.15)]'
                    : 'bg-[#16181d] border-[#23262B] text-[#8c947c] hover:border-[#8c947c]/50 hover:text-[#e0e4d2]'
                }`}
              >
                <span>✦ {c.chartName}</span>
                {c.id !== 'demo' && (
                  <button
                    onClick={e => handleDeleteChart(c.id, e)}
                    className="p-1 rounded text-[#8c947c] hover:text-red-400 transition-colors"
                    title="Remove saved chart"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Primary Birth Information Input Form (Cleaned without Lat/Lon) */}
      {showForm && (
        <div className="mb-6 p-5 md:p-6 rounded-xl bg-[#090b0e] border border-[#b8fc4b]/40 space-y-4 animate-fadeIn shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-[#23262B] pb-3">
            <h3 className="font-headline-sm text-sm text-[#e0e4d2] font-semibold flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#b8fc4b]" /> Enter Birth Date, Time & Location
            </h3>
            <span className="font-mono-label text-[10px] text-[#b8fc4b] font-bold uppercase tracking-wider">
              * Required for Natal Report
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chart Name */}
            <div>
              <label className="font-mono-label text-[11px] text-[#8c947c] mb-1 block">
                Chart Name / Subject *
              </label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. My Birth Chart"
                className="w-full bg-[#16181d] border border-[#23262B] rounded-lg px-3 py-2 text-xs text-[#e0e4d2] font-mono focus:border-[#b8fc4b] outline-none"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label className="font-mono-label text-[11px] text-[#8c947c] mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#7bd1fa]" /> Birth Date *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full bg-[#16181d] border border-[#23262B] rounded-lg px-3 py-2 text-xs text-[#e0e4d2] font-mono focus:border-[#b8fc4b] outline-none"
              />
            </div>

            {/* Birth Time */}
            <div>
              <label className="font-mono-label text-[11px] text-[#8c947c] mb-1 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#a855f7]" /> Exact Birth Time *
              </label>
              <input
                type="time"
                value={formTime}
                onChange={e => setFormTime(e.target.value)}
                className="w-full bg-[#16181d] border border-[#23262B] rounded-lg px-3 py-2 text-xs text-[#e0e4d2] font-mono focus:border-[#b8fc4b] outline-none"
              />
              <span className="text-[10px] text-[#8c947c] mt-0.5 block">
                Determines Ascendant & Houses
              </span>
            </div>

            {/* Location Name */}
            <div>
              <label className="font-mono-label text-[11px] text-[#8c947c] mb-1 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#b8fc4b]" /> City / Location *
              </label>
              <input
                type="text"
                value={formLocName}
                onChange={e => setFormLocName(e.target.value)}
                placeholder="e.g. New York, London, Tokyo"
                className="w-full bg-[#16181d] border border-[#23262B] rounded-lg px-3 py-2 text-xs text-[#e0e4d2] font-mono focus:border-[#b8fc4b] outline-none"
              />
              <span className="text-[10px] text-[#8c947c] mt-0.5 block">
                Auto-maps ephemeris location
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#23262B]">
            <span className="text-xs text-[#8c947c] font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#b8fc4b]" />
              Fills natal placements, Sacred 7 scores & live transit overlay
            </span>

            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-[#8c947c] hover:text-[#e0e4d2]"
              >
                Close
              </button>
              <button
                onClick={() => calculateChartAttachment()}
                disabled={calculating}
                className="px-6 py-2.5 rounded-lg text-xs font-mono font-bold bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#b8fc4b]/20"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating Chart...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Generate Attachment Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Formatting Toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="font-mono-label text-xs uppercase tracking-wider text-[#8c947c] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#7bd1fa]" /> Attachment File Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`py-2 px-3 rounded-lg text-xs font-mono transition-all flex flex-col items-center justify-center border ${
                  format === f.id
                    ? 'bg-[#b8fc4b]/15 border-[#b8fc4b] text-[#b8fc4b] font-bold shadow-[0_0_15px_rgba(184,252,75,0.15)]'
                    : 'bg-[#16181d] border-[#23262B] text-[#8c947c] hover:border-[#8c947c]/50 hover:text-[#e0e4d2]'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[10px] opacity-70">{f.ext}</span>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-[#8c947c] font-mono flex items-center gap-3 pt-1">
            <span>{lineCount} lines</span>
            <span>·</span>
            <span>{charCount.toLocaleString()} chars</span>
            <span>·</span>
            <span className="text-[#b8fc4b]">~{tokenEstimate.toLocaleString()} tokens</span>
          </div>
        </div>

        {/* Section Toggles */}
        <div className="lg:col-span-2 space-y-3">
          <label className="font-mono-label text-xs uppercase tracking-wider text-[#8c947c] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#a855f7]" /> Included Attachment Sections
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {OPTION_KEYS.map(o => {
              const active = opts[o.key]
              return (
                <button
                  key={o.key}
                  onClick={() => toggleOption(o.key)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all text-left flex items-center gap-2 border ${
                    active
                      ? 'bg-[#1e232a] border-[#7bd1fa]/50 text-[#7bd1fa]'
                      : 'bg-[#16181d]/60 border-[#23262B] text-[#8c947c] opacity-60 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border ${
                      active
                        ? 'bg-[#7bd1fa]/20 border-[#7bd1fa] text-[#7bd1fa]'
                        : 'border-[#8c947c]/40 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#23262B]">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`flex-1 sm:flex-none py-3 px-6 rounded-xl font-headline-sm text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-lg ${
              copied
                ? 'bg-[#22c55e] text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] shadow-[0_0_20px_rgba(184,252,75,0.25)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Chart Attachment
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-none py-3 px-5 rounded-xl font-headline-sm text-sm font-semibold bg-[#16181d] border border-[#23262B] text-[#e0e4d2] hover:border-[#7bd1fa]/60 hover:text-[#7bd1fa] transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4 text-[#7bd1fa]" /> Download File (
            {FORMATS.find(f => f.id === format)?.ext})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Toggle Live Preview */}
          <button
            onClick={() => setShowPreview(prev => !prev)}
            className="py-2.5 px-4 rounded-xl text-xs font-mono text-[#8c947c] hover:text-[#e0e4d2] bg-[#16181d]/80 border border-[#23262B] hover:border-[#8c947c]/40 transition-all flex items-center gap-2"
          >
            <Code className="w-3.5 h-3.5 text-[#a855f7]" />
            {showPreview ? 'Hide Preview' : 'Preview Output'}
            {showPreview ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Open Full Studio Link */}
          <button
            onClick={() => router.push('/context-card')}
            className="py-2.5 px-4 rounded-xl text-xs font-mono text-[#7bd1fa] hover:text-[#9be1ff] bg-[#7bd1fa]/10 border border-[#7bd1fa]/30 hover:border-[#7bd1fa]/60 transition-all flex items-center gap-1.5"
          >
            Studio View <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Collapsible Live Code Preview Drawer */}
      {showPreview && (
        <div className="mt-6 pt-4 border-t border-[#23262B]/80 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-label text-xs text-[#8c947c] flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#b8fc4b]" /> Live Attachment Payload Preview
            </span>
            <span className="font-mono text-[10px] text-[#8c947c]">
              Format: <span className="text-[#b8fc4b] uppercase">{format}</span>
            </span>
          </div>
          <div className="bg-[#090b0e] border border-[#23262B] rounded-xl p-4 max-h-72 overflow-y-auto font-mono text-xs text-[#b8fc4b]/90 leading-relaxed shadow-inner">
            <pre className="whitespace-pre-wrap break-words">{outputText}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
