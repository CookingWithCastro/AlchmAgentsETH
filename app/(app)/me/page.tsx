import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ProfileOnboardingForm from '@/components/profile/onboarding-form'
import { calculateMC } from '@/lib/monica/monica-constant-validator'
import { backend } from '@/lib/backend'
import { getSunSign, getZodiacTheme } from '@/lib/zodiac-utils'
import { fetchRenderSupplementalData } from '@/lib/agents/render-supplemental'
import { MeClient } from './MeClient'
import './me.css'

export const dynamic = 'force-dynamic'

export default async function MePage() {
  const session = await auth()

  // ── Guest View ──────────────────────────────────────────────────────
  if (!session?.user?.id) {
    return (
      <div className="me-page">
        <div className="me-starfield" />
        <div className="me-guest-cta">
          <div className="me-guest-card">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✨</div>
            <h1>Begin Your Cosmic Journey</h1>
            <p>
              Create an account to unlock your personalized astrological profile, save conversations
              with AI agents, and track your consciousness evolution.
            </p>
            <ul className="feature-list">
              <li>
                <span className="icon">♈</span> Personalized natal chart analysis
              </li>
              <li>
                <span className="icon">🤖</span> Saved history with 50+ AI agents
              </li>
              <li>
                <span className="icon">🔮</span> Tarot, runes, and alchemical synthesis
              </li>
              <li>
                <span className="icon">📈</span> Consciousness evolution tracking
              </li>
            </ul>
            <div className="me-guest-buttons">
              <Link href="/auth/signup" className="btn-primary">
                Create Account
              </Link>
              <Link href="/auth/signin" className="btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Onboarding (no birth info yet) ──────────────────────────────────
  const userId = session.user.id
  const profile = await prisma.profiles.findUnique({ where: { userId } })

  if (!profile?.birthInfo) {
    return (
      <div className="me-page">
        <div className="me-starfield" />
        <div style={{ maxWidth: '36rem', margin: '3rem auto', padding: '0 1rem' }}>
          <div className="me-glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌟</div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '0.5rem',
              }}
            >
              Welcome, {session.user.name || 'Explorer'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem' }}>
              Let&apos;s personalize your Alchm experience with your birth details.
            </p>
          </div>
          <ProfileOnboardingForm />
        </div>
      </div>
    )
  }

  // ── Compute Alchemical Data ─────────────────────────────────────────
  let alchm: any = {}
  let computationError: string | null = null
  let renderSupplemental: any = null

  try {
    const birth = profile.birthInfo as any
    if (!birth || typeof birth !== 'object') {
      throw new Error('Invalid birth info format')
    }

    // Validate required birth data
    const requiredFields = ['year', 'month', 'day', 'hour', 'minute']
    for (const field of requiredFields) {
      if (typeof birth[field] !== 'number') {
        throw new Error(`Missing or invalid ${field} in birth info`)
      }
    }

    // Build a Date from birth info (birth.month is 0-based in this codebase)
    const birthDate = new Date(
      Date.UTC(birth.year, birth.month, birth.day, birth.hour ?? 12, birth.minute ?? 0)
    )

    const rawAlchemize = await backend.alchemy.alchemize(
      birthDate,
      birth.latitude ?? 0,
      birth.longitude ?? 0
    )

    // Fetch supplemental Render data stream
    try {
      const birthInfoInput = {
        name: profile.name || session.user.name || 'Subject',
        year: birth.year,
        month: birth.month, // 0-based month expected
        day: birth.day,
        hour: birth.hour ?? 12,
        minute: birth.minute ?? 0,
        latitude: birth.latitude ?? 0,
        longitude: birth.longitude ?? 0,
      }
      renderSupplemental = await fetchRenderSupplementalData(birthInfoInput as any)
    } catch (e) {
      console.error('Error fetching Render supplemental data:', e)
    }

    alchm = {
      'Alchemy Effects': {
        'Total Spirit': rawAlchemize.esms?.Spirit ?? 0,
        'Total Essence': rawAlchemize.esms?.Essence ?? 0,
        'Total Matter': rawAlchemize.esms?.Matter ?? 0,
        'Total Substance': rawAlchemize.esms?.Substance ?? 0,
      },
      'Total Effect Value': {
        Fire: rawAlchemize.elementalProperties?.Fire ?? 0,
        Water: rawAlchemize.elementalProperties?.Water ?? 0,
        Air: rawAlchemize.elementalProperties?.Air ?? 0,
        Earth: rawAlchemize.elementalProperties?.Earth ?? 0,
      },
      'Dominant Element': rawAlchemize.dominantElement ?? 'Fire',
      'Dominant Modality': rawAlchemize.dominantModality ?? 'Cardinal',
      Heat: rawAlchemize.thermodynamicProperties?.Heat ?? 0,
      Entropy: rawAlchemize.thermodynamicProperties?.Entropy ?? 0,
      Reactivity: rawAlchemize.thermodynamicProperties?.Reactivity ?? 0,
      Energy: rawAlchemize.thermodynamicProperties?.Energy ?? 0,
    }
  } catch (error: any) {
    console.error('Alchemical computation error:', error)
    computationError = error?.message || 'Failed to compute alchemical data'
    // Provide fallback data
    alchm = {
      'Alchemy Effects': {
        'Total Spirit': 1,
        'Total Essence': 1,
        'Total Matter': 1,
        'Total Substance': 1,
      },
      'Total Effect Value': {
        Fire: 1,
        Water: 1,
        Air: 1,
        Earth: 1,
      },
      'Dominant Element': 'Fire',
      'Dominant Modality': 'Cardinal',
      Heat: 0,
      Entropy: 0,
      Reactivity: 0,
      Energy: 0,
    }
  }

  // ── Extract Values ──────────────────────────────────────────────────
  const spirit = Number(alchm?.['Alchemy Effects']?.['Total Spirit'] || 0)
  const essence = Number(alchm?.['Alchemy Effects']?.['Total Essence'] || 0)
  const matter = Number(alchm?.['Alchemy Effects']?.['Total Matter'] || 0)
  const substance = Number(alchm?.['Alchemy Effects']?.['Total Substance'] || 0)

  const fire = Number(alchm?.['Total Effect Value']?.['Fire'] || 0)
  const water = Number(alchm?.['Total Effect Value']?.['Water'] || 0)
  const air = Number(alchm?.['Total Effect Value']?.['Air'] || 0)
  const earth = Number(alchm?.['Total Effect Value']?.['Earth'] || 0)

  const Heat = Number(alchm?.['Heat'] || 0)
  const Entropy = Number(alchm?.['Entropy'] || 0)
  const Reactivity = Number(alchm?.['Reactivity'] || 0)
  const EnergyValue = Number(alchm?.['Energy'] || 0)

  const monicaConstant = calculateMC(spirit, essence, matter, substance, fire, water, air, earth)
  const dominantElement = String(alchm?.['Dominant Element'] || 'Fire')
  const modality = String(alchm?.['Dominant Modality'] || '')

  // ── Zodiac Theme ────────────────────────────────────────────────────
  const birthInfo = profile.birthInfo as any
  const sunSign = getSunSign(birthInfo.month, birthInfo.day)
  const zodiacTheme = getZodiacTheme(sunSign)

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <MeClient
      user={{
        name: session.user.name,
        image: session.user.image,
      }}
      sunSign={sunSign}
      zodiacTheme={zodiacTheme}
      monicaConstant={monicaConstant}
      dominantElement={dominantElement}
      modality={modality}
      spirit={spirit}
      essence={essence}
      matter={matter}
      substance={substance}
      fire={fire}
      water={water}
      air={air}
      earth={earth}
      Heat={Heat}
      Entropy={Entropy}
      Reactivity={Reactivity}
      EnergyValue={EnergyValue}
      computationError={computationError}
      birthInfo={{
        year: birthInfo.year ?? 1990,
        month: birthInfo.month ?? 0,
        day: birthInfo.day ?? 1,
        hour: birthInfo.hour ?? 12,
        minute: birthInfo.minute ?? 0,
        latitude: birthInfo.latitude,
        longitude: birthInfo.longitude,
      }}
      profileName={profile.name}
      renderAstrologize={renderSupplemental?.raw?.astrology_info}
      renderAlchemize={renderSupplemental?.raw?.alchemy_info}
      renderImaginizer={renderSupplemental?.raw?.imaginizer_info}
    />
  )
}
