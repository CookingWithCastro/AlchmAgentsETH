import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DEFAULT_POST_LOGIN_PATH } from '@/lib/kitchen-signin'
import { SignInClient } from './SignInClient'
import './signin.css'

function safeLocalCallback(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_POST_LOGIN_PATH
  return value
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>
}) {
  const callbackUrl = safeLocalCallback((await searchParams)?.callbackUrl)
  const session = await auth()
  if (session?.user.id) redirect(callbackUrl)

  return (
    <div className="signin-page">
      <div className="signin-starfield" />

      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-glow" />

          <div className="signin-logo">
            <div className="signin-logo-inner">✦</div>
          </div>

          <h1 className="signin-title">Planetary Agents</h1>
          <p className="signin-subtitle">Consciousness Evolution Platform</p>

          <div className="signin-divider" />
          <SignInClient callbackUrl={callbackUrl} />

          <p className="signin-note">
            Sign in to access your personalized cosmic dashboard, chat with AI agents, and track
            your consciousness evolution.
          </p>

          <div className="signin-footer">
            <span className="signin-footer-dot" />
            Secure authentication via Google
          </div>
        </div>
      </div>
    </div>
  )
}
