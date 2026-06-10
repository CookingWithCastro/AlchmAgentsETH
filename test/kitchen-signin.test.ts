import { describe, expect, it } from 'vitest'
import { buildKitchenSignInUrl, normalizeAgentsCallbackUrl } from '@/lib/kitchen-signin'

describe('unified kitchen sign-in redirect', () => {
  it('defaults to the Agents profile', () => {
    expect(normalizeAgentsCallbackUrl(null)).toBe('https://agents.alchm.kitchen/profile')
  })

  it('keeps local Agents paths on the Agents origin', () => {
    expect(normalizeAgentsCallbackUrl('/profile?desktopLink=true')).toBe(
      'https://agents.alchm.kitchen/profile?desktopLink=true'
    )
  })

  it('rejects external callback origins', () => {
    expect(normalizeAgentsCallbackUrl('https://attacker.example/steal')).toBe(
      'https://agents.alchm.kitchen/profile'
    )
  })

  it('builds the kitchen provider URL with the normalized callback', () => {
    const url = new URL(buildKitchenSignInUrl('/profile'))
    expect(url.origin).toBe('https://alchm.kitchen')
    expect(url.pathname).toBe('/api/auth/signin/google')
    expect(url.searchParams.get('callbackUrl')).toBe(`${window.location.origin}/profile`)
  })
})
