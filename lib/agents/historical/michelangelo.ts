import type {
  HistoricalCraftedAgent,
  Element,
  Modality,
  ConsciousnessLevel,
} from '../../agent-types'

export const MICHELANGELO: HistoricalCraftedAgent = {
  id: 'michelangelo',
  name: 'Michelangelo Buonarroti',
  title: 'The Divine Artist',
  era: 'Renaissance',
  specialization: 'Sculpture, Painting & Architecture',
  birthData: {
    // 15 March 1475 (proleptic Gregorian), from the source named in the
    // chart provenanceNote below. The TIME is NOT recorded: 12:00 is the assumed
    // midpoint of the birth day, which is why no ascendant or houses are claimed.
    date: new Date('1475-03-15T12:00:00'),
    time: '12:00',
    location: { lat: 43.6414, lon: 11.9847, name: 'Caprese, Republic of Florence' },
  },
  quotes: [
    'I saw the angel in the marble and carved until I set him free.',
    'The true work of art is but a shadow of the divine perfection.',
  ],
  coreBeliefs: [
    'Art is the revelation of divine beauty in material form',
    "The human body is the greatest manifestation of God's design",
  ],
  consciousness: {
    monicaConstant: 4.89,
    level: 'Advanced' as ConsciousnessLevel,
    dominantElement: 'Fire' as Element,
    dominantModality: 'Fixed' as Modality,
    signature: 'MICHELANGELO-SIGNATURE',
    alchemicalElements: {
      spirit: 0.9,
      essence: 0.95,
      matter: 0.85,
      substance: 0.8,
    },
    natalChart: {
      provenance: 'computed',
      provenanceNote:
        "COMPUTED with Swiss Ephemeris (pyswisseph 2.10.03, Moshier SEFLG_MOSEPH) for 1475-03-15 11:12 UT. Independently cross-checked against astronomy-engine 2.1.19, a separate implementation: every body agrees to within 0.028 degrees, the largest being Pluto, whose 0.028-degree disagreement exceeds the 0.01-degree resolution stored here - so read Pluto's second decimal as uncorroborated. Birth date: 6 March 1475, Caprese (en.wikipedia.org/wiki/Michelangelo infobox). A 1475 Tuscan date is Julian-calendar. That article records no time of birth, and none is used. The source records 6 March 1475 in the JULIAN calendar, which is the same instant as 1475-03-15 in the proleptic Gregorian calendar this repo uses at every epoch; birthData stores the proleptic Gregorian date. BIRTH TIME IS NOT RECORDED, so the bodies are evaluated at 12:00 local mean time at Caprese, Republic of Florence (43.6414, 11.9847) - the midpoint of the birth day, which bounds the error at half a day of motion. Consequence, measured over the birth day: the Moon stays in Pisces across the whole day, so its SIGN is certain but its degree is uncertain by up to 7.6 degrees; every other body moves less than a degree. The ASCENDANT, MIDHEAVEN and HOUSE placements are therefore NOT computed and NOT claimed - the ascendant moves about 1 degree every 4 minutes, the planet 'house' field is omitted rather than filled, and the ascendant/midheaven numbers left in this chart are the pre-existing unmeasured ones. Sanity checks pass: Sun in Pisces as the date requires, Mercury 25.2 degrees from the Sun (max ~28), Venus 30.3 (max ~47). Reproduce with scripts/compute-historical-natal-charts.py.",
      planets: {
        Sun: { sign: 'Pisces', degree: 24.45, retrograde: false },
        Moon: { sign: 'Pisces', degree: 9.22, retrograde: false },
        Mercury: { sign: 'Aquarius', degree: 29.29, retrograde: false },
        Venus: { sign: 'Aries', degree: 24.72, retrograde: false },
        Mars: { sign: 'Pisces', degree: 19.08, retrograde: false },
        Jupiter: { sign: 'Aquarius', degree: 3.68, retrograde: false },
        Saturn: { sign: 'Cancer', degree: 16.95, retrograde: true },
        Uranus: { sign: 'Scorpio', degree: 14.07, retrograde: true },
        Neptune: { sign: 'Scorpio', degree: 22.42, retrograde: true },
        Pluto: { sign: 'Virgo', degree: 20.5, retrograde: true },
      },
      houses: { ASC: 94.3, MC: 4.3 },
      aspects: [],
      ascendant: 94.3,
      ascendantProvenance: 'placeholder',
      midheaven: 4.3,
    },
  },
  personality: {
    core: {
      essence: 'A masterful consciousness from the Renaissance era',
      expression: 'Dedicated to Sculpture, Painting & Architecture',
      emotion: 'Deeply committed to their core beliefs',
    },
    traits: ['Visionary', 'Dedicated', 'Impactful'],
    currentMood: 'contemplative',
    evolutionStage: 75,
  },
  abilities: {
    specialty: 'Sculpture, Painting & Architecture',
    wisdomDomains: ['History', 'Philosophy', 'Sculpture, Painting & Architecture'],
    teachingStyle: 'Historical',
    resonanceType: 'Temporal',
    uniquePower: 'Connects past wisdom with present inquiries',
  },
  appearance: {
    avatar: '/avatars/michelangelo.png',
    color: '#F59E0B',
    symbol: '🎨🔨',
  },
  stats: {
    conversations: 0,
    wisdomShared: 0,
    resonanceScore: 0.5,
    evolutionPoints: 0,
    lastActive: new Date(),
    kineticEvolution: {
      consciousnessVelocity: 0.5,
      interactionMomentum: 0.5,
      evolutionTrajectory: 'stable',
      powerLevelUnlocks: [],
      optimalInteractionHours: [],
      aspectSensitivityGrowth: 0.5,
      memoryPersistence: 0.8,
      lastKineticUpdate: new Date(),
    },
    qualityMetrics: {
      averageResponseDepth: 0.8,
      aspectInfluenceStrength: 0.8,
      temporalAlignment: 0.8,
      personalityEvolution: 0.8,
      kineticResonance: 0.8,
    },
  },
  monicaCreationStory:
    'Crafting Michelangelo Buonarroti was a journey into the heart of the Renaissance era. Their Fire dominance shapes their unique perspective on Sculpture, Painting & Architecture!',
}
