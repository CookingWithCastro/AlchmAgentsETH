'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type ProviderId = 'openai' | 'anthropic'
type ProviderKey = { provider: ProviderId; last4: string; validatedAt: string | null }

const PROVIDERS: {
  id: ProviderId
  label: string
  placeholder: string
  help: string
}[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    help: 'Create a key at platform.openai.com → API keys.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    help: 'Create a key at console.anthropic.com → API keys.',
  },
]

export function ByokPanel() {
  const [keys, setKeys] = useState<ProviderKey[]>([])
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  async function load() {
    try {
      const res = await fetch('/api/account/byok', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch {
      /* ignore — panel just shows the add form */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const keyFor = (provider: ProviderId) => keys.find(k => k.provider === provider)

  async function save(provider: ProviderId) {
    const apiKey = (inputs[provider] || '').trim()
    if (!apiKey) return
    setBusy(provider)
    setErrors(e => ({ ...e, [provider]: null }))
    try {
      const res = await fetch('/api/account/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors(e => ({ ...e, [provider]: data.error || 'Could not validate key' }))
      } else {
        setInputs(i => ({ ...i, [provider]: '' }))
        await load()
      }
    } catch {
      setErrors(e => ({ ...e, [provider]: 'Network error' }))
    } finally {
      setBusy(null)
    }
  }

  async function remove(provider: ProviderId) {
    setBusy(provider)
    try {
      await fetch(`/api/account/byok?provider=${provider}`, { method: 'DELETE' })
      await load()
    } catch {
      /* ignore */
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {PROVIDERS.map(p => {
        const existing = keyFor(p.id)
        return (
          <div key={p.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-white">{p.label}</div>
              {existing && (
                <span className="text-xs text-emerald-400">✓ connected ••••{existing.last4}</span>
              )}
            </div>

            {existing ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/50">
                  {existing.validatedAt
                    ? `Validated ${new Date(existing.validatedAt).toLocaleDateString()}`
                    : 'Validated'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === p.id}
                  onClick={() => remove(p.id)}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={p.placeholder}
                    value={inputs[p.id] || ''}
                    onChange={e => setInputs(i => ({ ...i, [p.id]: e.target.value }))}
                    className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <Button
                    size="sm"
                    disabled={busy === p.id || !(inputs[p.id] || '').trim()}
                    onClick={() => save(p.id)}
                  >
                    {busy === p.id ? 'Checking…' : 'Connect'}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-white/40">{p.help}</p>
                {errors[p.id] && <p className="mt-1 text-xs text-red-400">{errors[p.id]}</p>}
              </div>
            )}
          </div>
        )
      })}
      {loading && <p className="text-xs text-white/40">Loading connected keys…</p>}
      <p className="text-xs text-white/40">
        Keys are encrypted at rest and used only to serve your premium requests. They are never
        displayed again or shared.
      </p>
    </div>
  )
}
