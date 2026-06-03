'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { buildKitchenSignInUrl } from '@/lib/kitchen-signin'
import './signin.css'

// The interactive sign-in card lives in its own component because it
// reads useSearchParams(). In Next.js 15 a client hook that opts the
// route out of static rendering must sit under a <Suspense> boundary,
// otherwise `next build` hard-fails at the "Generating static pages"
// step with: "useSearchParams() should be wrapped in a suspense
// boundary at page /auth/signin". That build failure was blocking
// EVERY production deploy (so newer routes like /yield 404'd on the
// stale deploy). Keep this split intact.
function SignInContent() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      window.location.href = buildKitchenSignInUrl(callbackUrl)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="signin-google-btn"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <div className="signin-spinner" />
      ) : (
        <svg className="signin-google-icon" viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
    </button>
  )
}

// Fallback rendered while the Suspense boundary resolves (and during
// the static-prerender bailout). Mirrors the button's resting state so
// there's no layout shift.
function SignInButtonFallback() {
  return (
    <button type="button" className="signin-google-btn" disabled>
      <div className="signin-spinner" />
      <span>Loading…</span>
    </button>
  )
}

export default function SignInPage() {
  return (
    <div className="signin-page">
      <div className="signin-starfield" />

      <div className="signin-container">
        <div className="signin-card">
          {/* Animated glow border */}
          <div className="signin-glow" />

          {/* Logo / Icon */}
          <div className="signin-logo">
            <div className="signin-logo-inner">✦</div>
          </div>

          <h1 className="signin-title">Planetary Agents</h1>
          <p className="signin-subtitle">Consciousness Evolution Platform</p>

          <div className="signin-divider" />

          <Suspense fallback={<SignInButtonFallback />}>
            <SignInContent />
          </Suspense>

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
