import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { generateAccurateHoroscope } from '@/lib/monica/horoscope-generator'
import { utcDateFromParts } from '@/lib/enhanced-astronomical-calculator'
import { getAlchemicalQuantitiesLegacy } from '@/lib/backend'
import { analyzePhiAxisIndex } from '@/lib/monica/monica-constant'

export const revalidate = 0

const BirthDataSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().min(1).max(200).optional(),
})

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name : undefined
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl : undefined
    const rawBirthInfo = body?.birthInfo
    const sharing = body?.sharingPreferences
    const dietaryPreferences = body?.dietaryPreferences || body?.dietary_preferences

    if (!rawBirthInfo) {
      return NextResponse.json({ error: 'Missing birthInfo' }, { status: 400 })
    }

    const parsedBirth = BirthDataSchema.safeParse(rawBirthInfo)
    if (!parsedBirth.success) {
      return NextResponse.json(
        { error: 'Invalid birthInfo', details: parsedBirth.error.format() },
        { status: 400 }
      )
    }

    const birthInfo = parsedBirth.data

    // `Date.UTC` remaps years 0-99 to 1900-1999, silently and per spec, so a
    // birth year of 69 would be stored as 1969 on this user_profiles write path.
    // `birthInfo.month` is 0-based here (schema above: min(0).max(11)), which is
    // why it is incremented for utcDateFromParts and again at :58 for the
    // horoscope generator — both of those take a 1-based month.
    const birthDate = utcDateFromParts(
      birthInfo.year,
      birthInfo.month + 1,
      birthInfo.day,
      birthInfo.hour,
      birthInfo.minute
    )

    // Generate natal chart and alchemical metrics
    const horoscope = generateAccurateHoroscope({
      year: birthInfo.year,
      month: birthInfo.month + 1,
      day: birthInfo.day,
      hour: birthInfo.hour,
      minute: birthInfo.minute,
      latitude: birthInfo.latitude,
      longitude: birthInfo.longitude,
    })

    const alchm = await getAlchemicalQuantitiesLegacy(
      birthDate,
      birthInfo.latitude,
      birthInfo.longitude
    )

    const spirit = alchm?.['Alchemy Effects']?.['Total Spirit'] || 0
    const essence = alchm?.['Alchemy Effects']?.['Total Essence'] || 0
    const matter = alchm?.['Alchemy Effects']?.['Total Matter'] || 0
    const substance = alchm?.['Alchemy Effects']?.['Total Substance'] || 0

    const phiAxis = analyzePhiAxisIndex({
      spirit,
      essence,
      matter,
      substance,
      Heat: alchm?.Heat || 0,
      Entropy: alchm?.Entropy || 0,
      Reactivity: alchm?.Reactivity || 0,
      Energy: alchm?.Energy || 0,
    })

    const profile = await prisma.user_profiles.upsert({
      where: { userId },
      update: {
        birthDate,
        birthTime: `${String(birthInfo.hour).padStart(2, '0')}:${String(birthInfo.minute).padStart(2, '0')}`,
        birthLocation: {
          name: birthInfo.locationName || 'Unknown',
          latitude: birthInfo.latitude,
          longitude: birthInfo.longitude,
        },
        natalChart: horoscope as any,
        // COLUMN NAME MISMATCH: the `monicaConstant` column on user_profiles receives the
        // Phi Axis Index (phi-weighted ratio of the alchemical axes), NOT the thermodynamic
        // Monica from lib/thermodynamics/kalchm.ts. The column rename needs a migration and
        // is deliberately out of scope here — see the NOT NULL monicaConstant/kalchmConstant
        // migration plan in docs/ and the warning in CLAUDE.md.
        monicaConstant: phiAxis.value,
        dominantElement: (alchm as any)?.['Dominant Element'] || 'Fire',
        ...(typeof sharing?.allowPublicAgents === 'boolean'
          ? { allowPublicAgents: sharing.allowPublicAgents }
          : {}),
        ...(typeof sharing?.shareChartWithAgents === 'boolean'
          ? { shareChartWithAgents: sharing.shareChartWithAgents }
          : {}),
        ...(dietaryPreferences ? { dietaryPreferences } : {}),
      },
      create: {
        userId,
        birthDate,
        birthTime: `${String(birthInfo.hour).padStart(2, '0')}:${String(birthInfo.minute).padStart(2, '0')}`,
        birthLocation: {
          name: birthInfo.locationName || 'Unknown',
          latitude: birthInfo.latitude,
          longitude: birthInfo.longitude,
        },
        natalChart: horoscope as any,
        // COLUMN NAME MISMATCH: see the note on the `update` branch above — this column
        // stores the Phi Axis Index, not the thermodynamic Monica.
        monicaConstant: phiAxis.value,
        dominantElement: (alchm as any)?.['Dominant Element'] || 'Fire',
        dietaryPreferences: dietaryPreferences || null,
      },
    })

    if (name || avatarUrl) {
      await prisma.profiles.upsert({
        where: { userId },
        update: {
          ...(name ? { name } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
          birthInfo: {
            year: birthInfo.year,
            month: birthInfo.month,
            day: birthInfo.day,
            hour: birthInfo.hour,
            minute: birthInfo.minute,
            latitude: birthInfo.latitude,
            longitude: birthInfo.longitude,
          },
        },
        create: {
          userId,
          name: name || 'Explorer',
          avatarUrl: avatarUrl || null,
          birthInfo: {
            year: birthInfo.year,
            month: birthInfo.month,
            day: birthInfo.day,
            hour: birthInfo.hour,
            minute: birthInfo.minute,
            latitude: birthInfo.latitude,
            longitude: birthInfo.longitude,
          },
        },
      })
    }

    return NextResponse.json({
      profile,
      calculations: {
        // Response key kept for API compatibility; the payload is the Phi Axis Index
        // analysis, not the thermodynamic Monica (lib/thermodynamics/kalchm.ts).
        monicaConstant: phiAxis,
        alchemy: {
          spirit,
          essence,
          matter,
          substance,
          dominantElement: (alchm as any)?.['Dominant Element'] || 'Fire',
        },
      },
    })
  } catch (e: any) {
    console.error('Profile update error:', e)
    return NextResponse.json(
      { error: 'Failed to update profile', details: e?.message || String(e) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const [basicProfile, detailedProfile] = await Promise.all([
      prisma.profiles.findUnique({ where: { userId: session.user.id } }),
      prisma.user_profiles.findUnique({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({
      profile: detailedProfile,
      presentation: basicProfile,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to load profile', details: e?.message || String(e) },
      { status: 500 }
    )
  }
}
