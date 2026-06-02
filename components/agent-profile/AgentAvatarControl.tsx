'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { isConfiguredAdminIdentity } from '@/lib/admin-identity'

interface AgentAvatarControlProps {
  agentId: string
  name: string
  initialAvatar?: string | null
  symbol?: string | null
  color: string
}

function isImageAvatar(value?: string | null): value is string {
  if (!value) return false
  return /^(https?:\/\/|\/|data:image\/|blob:)/.test(value.trim())
}

export function AgentAvatarControl({
  agentId,
  name,
  initialAvatar,
  symbol,
  color,
}: AgentAvatarControlProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    isImageAvatar(initialAvatar) ? initialAvatar : null
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  // Avatar generation is an admin/ops action (paid external generation + a
  // persisted overwrite). The route enforces this server-side; here we just hide
  // the button for non-admins. Resolved client-side so the cached page stays
  // shared across users.
  const { data: session } = useSession()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; name?: string | null; role?: string }
    | undefined
  const canGenerate = sessionUser?.role === 'admin' || isConfiguredAdminIdentity(sessionUser)

  useEffect(() => {
    if (!isImageAvatar(initialAvatar)) {
      setAvatarUrl(null)
      return
    }

    let cancelled = false
    const image = new window.Image()
    image.onload = () => {
      if (!cancelled) {
        setAvatarUrl(current => current || initialAvatar)
      }
    }
    image.onerror = () => {
      if (!cancelled) {
        setAvatarUrl(current => (current === initialAvatar ? null : current))
      }
    }
    image.src = initialAvatar

    return () => {
      cancelled = true
    }
  }, [initialAvatar])

  async function handleGenerateAvatar() {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/agents/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, slug: agentId }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success || !data.avatarUrl) {
        throw new Error(data.error || 'Avatar generation failed')
      }

      setAvatarUrl(data.avatarUrl)
      toast({
        title: 'Avatar ready',
        description: data.sync?.success
          ? 'Generated, saved, and synced to alchm.kitchen.'
          : 'Generated and saved. WTEN sync can be retried later.',
      })
    } catch (error) {
      toast({
        title: 'Avatar generation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-28 w-28 rounded-2xl border-2 object-cover shadow-lg md:h-32 md:w-32"
          style={{ borderColor: color, background: `${color}22` }}
          onError={() => setAvatarUrl(null)}
        />
      ) : (
        <div
          className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 text-5xl shadow-lg backdrop-blur-sm md:h-32 md:w-32 md:text-6xl"
          style={{ borderColor: color, background: `${color}22` }}
          aria-hidden="true"
        >
          <span>{symbol || '✦'}</span>
        </div>
      )}

      {canGenerate && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGenerateAvatar}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {avatarUrl ? 'Regenerate Avatar' : 'Generate Avatar'}
        </Button>
      )}
    </div>
  )
}
