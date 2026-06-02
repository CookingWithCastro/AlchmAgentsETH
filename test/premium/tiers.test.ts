import { describe, expect, it } from 'vitest'
import { capModelTier } from '@/lib/premium/tiers'

describe('capModelTier', () => {
  it('always allows the free tier', () => {
    expect(capModelTier('free', 'free', [])).toBe('free')
    expect(capModelTier('free', 'alchemist', [])).toBe('free')
  })

  it('degrades a free user requesting any premium tier to free', () => {
    expect(capModelTier('cheap_fast', 'free', [])).toBe('free')
    expect(capModelTier('primary', 'free', [])).toBe('free')
    expect(capModelTier('reflective', 'free', [])).toBe('free')
  })

  it('lets subscribers use premium tiers', () => {
    expect(capModelTier('primary', 'alchemist', [])).toBe('primary')
    expect(capModelTier('reflective', 'alchemist', [])).toBe('reflective')
    expect(capModelTier('reflective', 'master', [])).toBe('reflective')
  })

  it('lets a free user with an Anthropic BYOK key use premium tiers', () => {
    expect(capModelTier('reflective', 'free', ['anthropic'])).toBe('reflective')
    expect(capModelTier('primary', 'free', ['anthropic'])).toBe('primary')
  })

  it('does not unlock Anthropic chat tiers from an OpenAI-only BYOK key', () => {
    // Historical-agent premium tiers are Anthropic-served.
    expect(capModelTier('reflective', 'free', ['openai'])).toBe('free')
  })

  it('defaults unknown/empty requests to free', () => {
    expect(capModelTier(undefined, 'master', [])).toBe('free')
    expect(capModelTier('bogus', 'master', [])).toBe('free')
    expect(capModelTier(null, 'alchemist', [])).toBe('free')
  })
})
