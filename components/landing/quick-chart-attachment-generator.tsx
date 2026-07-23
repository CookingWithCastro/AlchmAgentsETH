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
import { buildOutput, buildMultiChartOutput } from '@/lib/context-card/serializers'
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

const STORAGE_KEY = 'alchm_saved_user_charts'

const FORMATS: Array<{
  id: ExportFormat
  label: string
  icon: typeof FileText
  ext: string
  mime: string
}> = [
  { id: 'md', label: 'Markdown (.md)', icon: FileText, ext: '.md', mime: 'text/markdown' },
  { id: 'txt', label: 'Plain Text (.txt)', icon: FileText, ext: '.txt', mime: 'text/plain' },
  { id: 'json', label: 'JSON (.json)', icon: Code, ext: '.json', mime: 'application/json' },
]

const DEFAULT_OPTS: ExportOptions = {
  promptHeader: true,
  synopsis: true,
  houses: true,
  aspects: true,
  minorAspects: true,
  transits: true,
  alchm: true,
  annotated: true,
}

// Background lookup mapping common city names to ephemeris coordinates
function resolveCoordinates(locationStr: string): { lat: number; lon: number } {
  const clean = (locationStr || '').toLowerCase().trim()
  if (clean.includes('brooklyn') || clean.includes('new york') || clean.includes('nyc')) {
    return { lat: 40.6782, lon: -73.9442 }
  }
  if (clean.includes('los angeles') || clean.includes('la') || clean.includes('california')) {
    return { lat: 34.0522, lon: -118.2437 }
  }
  if (clean.includes('london') || clean.includes('uk') || clean.includes('england')) {
    return { lat: 51.5074, lon: -0.1278 }
  }
  if (clean.includes('paris') || clean.includes('france')) {
    return { lat: 48.8566, lon: 2.3522 }
  }
  if (clean.includes('tokyo') || clean.includes('japan')) {
    return { lat: 35.6762, lon: 139.6503 }
  }
  if (clean.includes('sydney') || clean.includes('australia')) {
    return { lat: -33.8688, lon: 151.2093 }
  }
  if (clean.includes('berlin') || clean.includes('germany')) {
    return { lat: 52.52, lon: 13.405 }
  }
  if (clean.includes('chicago')) {
    return { lat: 41.8781, lon: -87.6298 }
  }
  if (clean.includes('toronto') || clean.includes('canada')) {
    return { lat: 43.6532, lon: -79.3832 }
  }
  return { lat: 40.7128, lon: -74.006 }
}

export function QuickChartAttachmentGenerator() {
  const router = useRouter()
  const [data, setData] = useState<ContextCardData>(DEMO_CARD_DATA)
  const [format, setFormat] = useState<ExportFormat>('md')
  const [opts, setOpts] = useState<ExportOptions>(DEFAULT_OPTS)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [charts, setCharts] = useState<UserChartProfile[]>([
    {
      id: 'demo',
      chartName: 'Primary Birth Chart',
      birthDate: '1990-06-01',
      birthTime: '10:17 AM',
      birthLocation: { name: 'Brooklyn, NY, USA', lat: 40.6782, lon: -73.9442 },
      isPrimary: true,
      data: DEMO_CARD_DATA,
    },
  ])
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>(['demo'])

  // Form Inputs
  const [formName, setFormName] = useState('Partner / Second Chart')
  const [formDate, setFormDate] = useState('1992-10-14')
  const [formTime, setFormTime] = useState('16:30')
  const [formLocName, setFormLocName] = useState('Los Angeles, CA, USA')

  // Load Saved Charts & User Primary Chart from API
  useEffect(() => {
    let unmounted = false
    const initChartContext = async () => {
      let savedLocal: UserChartProfile[] = []
      try {
        const rawLocal = localStorage.getItem(STORAGE_KEY)
        if (rawLocal) savedLocal = JSON.parse(rawLocal)
      } catch {
        /* ignore storage read error */
      }

      try {
        const res = await fetch('/api/context-card/generate', { method: 'GET' })
        if (res.ok) {
          const body = await res.json()
          if (!unmounted && body.success && body.data) {
            setData(body.data)
            const serverCharts: UserChartProfile[] = (body.savedCharts || []).map((c: any) => ({
              id: c.id,
              chartName: c.chartName,
              birthDate: c.birthDate,
              birthTime: c.birthTime,
              birthLocation: {
                name: c.birthLocation?.name || 'Saved Location',
                lat: c.birthLocation?.lat || 40.7128,
                lon: c.birthLocation?.lon || -74.006,
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
            setSelectedChartIds([merged[0].id])
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

  // Toggle chart selection for multi-chart reports
  const handleToggleChart = (chart: UserChartProfile) => {
    setSelectedChartIds(prev => {
      if (prev.includes(chart.id)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== chart.id)
      } else {
        return [...prev, chart.id]
      }
    })
    if (chart.data) {
      setData(chart.data)
    } else {
      calculateChartAttachment(chart)
    }
  }

  const handleSelectAllCharts = () => {
    if (selectedChartIds.length === charts.length) {
      setSelectedChartIds([charts[0].id])
    } else {
      setSelectedChartIds(charts.map(c => c.id))
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
            } catch {}
            return updated
          })
          setSelectedChartIds(prev => Array.from(new Set([...prev, newChart.id])))
          setShowForm(false)
          // Prepare form defaults for next additional chart entry
          setFormName(`Chart ${charts.length + 1}`)
          setFormDate('1995-06-21')
          setFormTime('12:00')
          setFormLocName('New York, NY, USA')
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
    setSelectedChartIds(prev => {
      const updated = prev.filter(i => i !== id)
      return updated.length > 0 ? updated : [filtered[0]?.id || 'demo']
    })
  }

  // Output text string formatting (supports multi-chart reports!)
  const outputText = useMemo(() => {
    const selectedProfiles = charts.filter(c => selectedChartIds.includes(c.id) && c.data)
    if (selectedProfiles.length > 1) {
      return buildMultiChartOutput(
        selectedProfiles.map(c => c.data!),
        format,
        opts
      )
    }
    const currentData = selectedProfiles[0]?.data || data
    return buildOutput(currentData, format, opts)
  }, [charts, selectedChartIds, data, format, opts])

  useEffect(() => {
    if (outputText && typeof window !== 'undefined') {
      try {
        localStorage.setItem('alchm_active_chart_context', outputText)
      } catch {}
    }
  }, [outputText])

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
    const slug =
      selectedChartIds.length > 1
        ? `alchm-multi-chart-report-${selectedChartIds.length}-charts`
        : (charts.find(c => c.id === selectedChartIds[0])?.chartName || 'alchm-chart-context')
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
              {selectedChartIds.length > 1
                ? `Multi-Chart (${selectedChartIds.length} Selected)`
                : charts.find(c => c.id === selectedChartIds[0])?.chartName || 'Active Chart'}
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
          className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] transition-all shrink-0 active:scale-95 shadow-md flex items-center gap-1.5"
        >
          {showForm
            ? 'Hide Birth Form'
            : charts.length > 1
              ? '+ Add Additional Chart'
              : '✏️ Input Birth Details'}
        </button>
      </div>

      {/* Saved Chart Multi-Selection Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="font-mono-label text-xs uppercase tracking-wider text-[#8c947c] flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#b8fc4b]" /> Select Charts to Include (
            {selectedChartIds.length} / {charts.length} selected)
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllCharts}
              className="text-xs font-mono text-[#b8fc4b] hover:underline"
            >
              {selectedChartIds.length === charts.length
                ? 'Select Single Chart'
                : '✦ Combine All Charts into 1 Report'}
            </button>
            <button
              onClick={() => setShowForm(prev => !prev)}
              className="py-1.5 px-3 rounded-lg text-xs font-mono text-[#b8fc4b] bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 hover:bg-[#b8fc4b]/20 transition-all flex items-center gap-1.5 font-bold"
            >
              {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? 'Close Input Form' : '+ Add Additional Chart'}
            </button>
          </div>
        </div>

        {/* Multi-Selectable Chart Pills */}
        <div className="flex flex-wrap gap-2">
          {charts.map(c => {
            const isSelected = selectedChartIds.includes(c.id)
            return (
              <div
                key={c.id}
                onClick={() => handleToggleChart(c)}
                className={`py-2 px-3.5 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1d2319] border-[#b8fc4b] text-[#b8fc4b] font-bold shadow-[0_0_15px_rgba(184,252,75,0.15)]'
                    : 'bg-[#16181d] border-[#23262B] text-[#8c947c] hover:border-[#8c947c]/50 hover:text-[#e0e4d2]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-[#b8fc4b]" />
                  ) : (
                    <span className="opacity-40">✦</span>
                  )}
                  {c.chartName}
                </span>
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

      {/* Primary Birth Information Input Form */}
      {showForm && (
        <div className="mb-6 p-5 md:p-6 rounded-xl bg-[#090b0e] border border-[#b8fc4b]/40 space-y-4 animate-fadeIn shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-[#23262B] pb-3">
            <h3 className="text-sm font-headline-sm font-bold text-[#b8fc4b] flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Birth Parameters Form
            </h3>
            <span className="text-[11px] font-mono text-[#8c947c]">
              Generates high-precision Ascendant & Placidus houses
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#8c947c] uppercase tracking-wider mb-1.5">
                Chart Name / Label
              </label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Partner, Secondary, Friend"
                className="w-full bg-[#16181d] border border-[#23262B] focus:border-[#b8fc4b] rounded-lg px-3 py-2 text-xs font-mono text-[#e0e4d2] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8c947c] uppercase tracking-wider mb-1.5">
                Birth Date <span className="text-[#b8fc4b]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-[#16181d] border border-[#23262B] focus:border-[#b8fc4b] rounded-lg px-3 py-2 text-xs font-mono text-[#e0e4d2] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8c947c] uppercase tracking-wider mb-1.5">
                Exact Birth Time <span className="text-[#b8fc4b]">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full bg-[#16181d] border border-[#23262B] focus:border-[#b8fc4b] rounded-lg px-3 py-2 text-xs font-mono text-[#e0e4d2] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8c947c] uppercase tracking-wider mb-1.5">
                City / Location <span className="text-[#b8fc4b]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formLocName}
                  onChange={e => setFormLocName(e.target.value)}
                  placeholder="e.g. New York, London, Tokyo, Los Angeles"
                  className="w-full bg-[#16181d] border border-[#23262B] focus:border-[#b8fc4b] rounded-lg px-3 py-2 text-xs font-mono text-[#e0e4d2] outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-mono text-[#8c947c] hover:text-[#e0e4d2] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => calculateChartAttachment()}
              disabled={calculating}
              className="px-5 py-2 rounded-lg text-xs font-mono font-bold bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating Ephemeris...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> ✨ Calculate & Add Chart to Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 bg-[#16181d] p-4 rounded-xl border border-[#23262B]">
        <div className="flex flex-wrap items-center gap-2">
          {FORMATS.map(f => {
            const Icon = f.icon
            const active = format === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                  active
                    ? 'bg-[#b8fc4b] text-black font-bold shadow-md'
                    : 'bg-[#0e1015] text-[#8c947c] hover:text-[#e0e4d2] border border-[#23262B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-[#b8fc4b] text-black hover:bg-[#c9fe6b] shadow-[0_0_20px_rgba(184,252,75,0.25)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied{' '}
                {selectedChartIds.length > 1 ? `Multi-Chart Report` : 'Attachment'}!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy{' '}
                {selectedChartIds.length > 1
                  ? `Multi-Chart Report (${selectedChartIds.length})`
                  : 'Chart Attachment'}
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl bg-[#0e1015] border border-[#23262B] text-[#e0e4d2] hover:border-[#b8fc4b]/50 hover:text-[#b8fc4b] font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            title="Download file to computer"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      {/* Included Sections Checkboxes */}
      <div className="mb-6 space-y-3">
        <label className="font-mono-label text-xs uppercase tracking-wider text-[#8c947c] flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#b8fc4b]" /> Included Report Sections
        </label>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            { key: 'promptHeader', label: 'LLM Prompt Header' },
            { key: 'synopsis', label: 'Astrological Synopsis' },
            { key: 'houses', label: 'House Cusps' },
            { key: 'aspects', label: 'Major Aspects' },
            { key: 'minorAspects', label: 'Minor Aspects' },
            { key: 'transits', label: 'Live Transits Overlay' },
            { key: 'alchm', label: 'Alchm Energy Layer' },
            { key: 'annotated', label: 'Placement Annotations' },
          ].map(item => {
            const k = item.key as keyof ExportOptions
            const active = opts[k]
            return (
              <button
                key={item.key}
                onClick={() => toggleOption(k)}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#1b2118] border-[#b8fc4b]/50 text-[#b8fc4b]'
                    : 'bg-[#16181d] border-[#23262B] text-[#8c947c] hover:text-[#e0e4d2]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                    active ? 'bg-[#b8fc4b] border-[#b8fc4b]' : 'border-[#8c947c]'
                  }`}
                >
                  {active && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                </div>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Collapsible Live Preview Drawer */}
      <div className="border border-[#23262B] rounded-xl bg-[#090b0e] overflow-hidden">
        <button
          onClick={() => setShowPreview(prev => !prev)}
          className="w-full px-4 py-3 bg-[#16181d] flex items-center justify-between text-xs font-mono text-[#8c947c] hover:text-[#e0e4d2] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#b8fc4b]" />
            <span className="text-[#e0e4d2] font-semibold">
              Live Attachment Payload Preview{' '}
              {selectedChartIds.length > 1 ? `(${selectedChartIds.length} Charts Combined)` : ''}
            </span>
            <span className="text-[10px] text-[#8c947c]">
              ({lineCount} lines · {charCount.toLocaleString()} chars · ~
              {tokenEstimate.toLocaleString()} tokens)
            </span>
          </div>
          {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showPreview && (
          <div className="p-4 bg-[#090b0e] border-t border-[#23262B]">
            <pre className="font-mono text-[11px] text-[#c2cab0] leading-relaxed overflow-x-auto max-h-[360px] p-4 bg-[#050608] rounded-lg border border-[#23262B] select-all scrollbar-thin scrollbar-thumb-[#23262B] scrollbar-track-transparent">
              {outputText}
            </pre>
          </div>
        )}
      </div>

      {/* Footer link to Context Card Studio */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#8c947c] pt-4 border-t border-[#23262B]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#b8fc4b]" />
          <span>Attachment payload optimized for GPT-4o, Claude 3.5 Sonnet, DeepSeek & Gemini</span>
        </div>
        <button
          onClick={() => router.push('/context-card')}
          className="text-[#b8fc4b] hover:underline flex items-center gap-1 font-semibold shrink-0"
        >
          Open Context Card Studio <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
