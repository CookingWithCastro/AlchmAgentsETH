'use client'

import React, { useState } from 'react'
import type { ExportFormat, ExportOptions } from '@/lib/context-card/types'

interface FormatDef {
  id: ExportFormat
  label: string
  ext: string
  mime: string
}

const FORMATS: FormatDef[] = [
  { id: 'md', label: 'Markdown', ext: '.md', mime: 'text/markdown' },
  { id: 'txt', label: 'Text', ext: '.txt', mime: 'text/plain' },
  { id: 'json', label: 'JSON', ext: '.json', mime: 'application/json' },
]

const FNAME = 'alchm-context-card'

const OPTS: { key: keyof ExportOptions; label: string }[] = [
  { key: 'promptHeader', label: 'Prompt header' },
  { key: 'synopsis', label: 'Synopsis' },
  { key: 'houses', label: 'Houses' },
  { key: 'aspects', label: 'Aspects' },
  { key: 'minorAspects', label: 'Minor aspects' },
  { key: 'transits', label: 'Transits' },
  { key: 'alchm', label: 'Alchm layer' },
  { key: 'annotated', label: 'Plain-English notes' },
]

function download(text: string, mime: string, ext: string) {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FNAME + ext
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

interface Props {
  format: ExportFormat
  setFormat: (f: ExportFormat) => void
  opts: ExportOptions
  toggleOpt: (key: keyof ExportOptions) => void
  output: string
  unlocked: boolean
  price: number
  balance: number
  onUnlock: () => void
  toast: (msg: string) => void
}

export function ExportPanel({
  format,
  setFormat,
  opts,
  toggleOpt,
  output,
  unlocked,
  price,
  balance,
  onUnlock,
  toast,
}: Props) {
  const [copied, setCopied] = useState(false)
  const fmt = FORMATS.find(f => f.id === format) || FORMATS[0]
  const lines = output.split('\n').length
  const chars = output.length
  const approxTokens = Math.round(chars / 4)

  const doCopy = async () => {
    if (!unlocked) return
    const ok = await copyText(output)
    if (ok) {
      setCopied(true)
      toast('Copied — paste into any LLM chat')
      setTimeout(() => setCopied(false), 1600)
    }
  }
  const doDownload = (f: FormatDef) => {
    if (!unlocked) return
    download(output, f.mime, f.ext)
    toast('Downloaded ' + FNAME + f.ext)
  }

  return (
    <div className="panel export">
      <div className="panel-head">
        <h2>Export</h2>
        <span className="sub">attach to any LLM</span>
      </div>

      {/* data-section toggles */}
      <div className="opt-row">
        {OPTS.map(o => (
          <span
            className={'opt ' + (opts[o.key] ? 'on' : '')}
            key={o.key}
            onClick={() => toggleOpt(o.key)}
          >
            <span className="box">✓</span>
            {o.label}
          </span>
        ))}
      </div>

      {/* format tabs */}
      <div className="fmt-tabs">
        {FORMATS.map(f => (
          <div
            className={'fmt-tab ' + (format === f.id ? 'active' : '')}
            key={f.id}
            onClick={() => setFormat(f.id)}
          >
            {f.label} <span className="ext">{f.ext}</span>
          </div>
        ))}
      </div>

      <div className={'code-wrap ' + (unlocked ? '' : 'locked')}>
        <pre className="code">{output}</pre>
        {!unlocked ? (
          <div className="lock-overlay">
            <div className="lock-card">
              <div className="ic">⬡</div>
              <div className="h">Locked preview</div>
              <div className="p">
                Unlock your context card for <b>{price} ESMS</b> to copy and download in every
                format. One unlock covers all formats and future edits.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="code-meta">
        <span>{fmt.ext.slice(1)}</span>
        <span className="sep"></span>
        <span>{lines} lines</span>
        <span className="sep"></span>
        <span>~{approxTokens.toLocaleString()} tokens</span>
        {unlocked ? (
          <span className="copy-mini opt" onClick={doCopy} style={{ cursor: 'pointer' }}>
            {copied ? '✓ copied' : 'copy'}
          </span>
        ) : null}
      </div>

      <div className="export-actions">
        {unlocked ? (
          <div className="cost-row owned">
            <div className="price">
              <span className="n">✓</span>
              <span className="u">Unlocked</span>
            </div>
            <div className="desc">
              Yours to re-download
              <br />
              in any format, anytime
            </div>
          </div>
        ) : (
          <div className="cost-row">
            <div className="price">
              <span className="n">{price}</span>
              <span className="u">ESMS</span>
            </div>
            <div className="desc">
              balance {balance} ESMS
              <br />
              members get 200 / month
            </div>
          </div>
        )}

        {!unlocked ? (
          <button className="unlock-btn" onClick={onUnlock}>
            ◈ &nbsp;Unlock context card · {price} ESMS
          </button>
        ) : (
          <>
            <button className={'copy-btn ' + (copied ? 'copied' : '')} onClick={doCopy}>
              {copied ? '✓ Copied to clipboard' : '⧉ Copy ' + fmt.label}
            </button>
            <div className="dl-row">
              {FORMATS.map(f => (
                <div className="dl-btn" key={f.id} onClick={() => doDownload(f)}>
                  ↓ <span className="ext">{f.ext}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="howto">
        <h4>How to use it</h4>
        <ol>
          <li>Unlock, then download or copy your card.</li>
          <li>Start a chat and attach the file (or paste it as your first message).</li>
          <li>
            Ask anything — timing, work, love, wellbeing. It answers from <i>your</i> chart, not a
            sun-sign blurb.
          </li>
        </ol>
        <div className="targets">
          <span className="tg">ChatGPT</span>
          <span className="tg">Claude</span>
          <span className="tg">Gemini</span>
          <span className="tg">Copilot</span>
          <span className="tg">any LLM</span>
        </div>
      </div>
    </div>
  )
}
