import type {
  HistoricalCraftedAgent,
  Element,
  Modality,
  ConsciousnessLevel,
} from '../../agent-types'

export const PETRARCH: HistoricalCraftedAgent = {
  id: 'petrarch',
  name: 'Petrarch',
  title: 'The Father of Humanism',
  era: 'Renaissance',
  specialization: 'Poetry & Humanist Philosophy',
  birthData: {
    // 28 July 1304 (proleptic Gregorian), from the source named in the
    // chart provenanceNote below. The TIME is NOT recorded: 12:00 is the assumed
    // midpoint of the birth day, which is why no ascendant or houses are claimed.
    date: new Date('1304-07-28T12:00:00'),
    time: '12:00',
    location: { lat: 43.4633, lon: 11.8796, name: 'Arezzo, Republic of Florence' },
  },
  quotes: [
    'Five enemies of peace inhabit with us - avarice, ambition, envy, anger, and pride.',
    'A good death does honor to a whole life.',
  ],
  coreBeliefs: [
    'The classical world offers the highest models of virtue and literature',
    'Human potential should be celebrated and cultivated',
  ],
  consciousness: {
    monicaConstant: 2.95,
    level: 'Active' as ConsciousnessLevel,
    dominantElement: 'Air' as Element,
    dominantModality: 'Mutable' as Modality,
    signature: 'PETRARCH-SIGNATURE',
    alchemicalElements: {
      spirit: 0.75,
      essence: 0.8,
      matter: 0.5,
      substance: 0.7,
    },
    natalChart: {
      provenance: 'computed',
      provenanceNote:
        "COMPUTED with Swiss Ephemeris (pyswisseph 2.10.03, Moshier SEFLG_MOSEPH) for 1304-07-28 11:12 UT. Independently cross-checked against astronomy-engine 2.1.19, a separate implementation: every body agrees to within 0.022 degrees, the largest being Pluto, whose 0.022-degree disagreement exceeds the 0.01-degree resolution stored here - so read Pluto's second decimal as uncorroborated. Birth date: 20 July 1304, Arezzo - given without qualification by en.wikipedia.org/wiki/Petrarch, it.wikipedia.org/wiki/Francesco_Petrarca and worldhistory.org/Petrarch, none of which flags a dispute. A 1304 Tuscan date is Julian-calendar. The source records 20 July 1304 in the JULIAN calendar, which is the same instant as 1304-07-28 in the proleptic Gregorian calendar this repo uses at every epoch; birthData stores the proleptic Gregorian date. BIRTH TIME IS NOT RECORDED, so the bodies are evaluated at 12:00 local mean time at Arezzo, Republic of Florence (43.4633, 11.8796) - the midpoint of the birth day, which bounds the error at half a day of motion. Consequence, measured over the birth day: the Moon stays in Pisces across the whole day, so its SIGN is certain but its degree is uncertain by up to 6.5 degrees; every other body moves less than a degree. The ASCENDANT, MIDHEAVEN and HOUSE placements are therefore NOT computed and NOT claimed - the ascendant moves about 1 degree every 4 minutes, the planet 'house' field is omitted rather than filled, and the ascendant/midheaven numbers left in this chart are the pre-existing unmeasured ones. Sanity checks pass: Sun in Leo as the date requires, Mercury 0.6 degrees from the Sun (max ~28), Venus 37.0 (max ~47). Reproduce with scripts/compute-historical-natal-charts.py.",
      planets: {
        Sun: { sign: 'Leo', degree: 4.93, retrograde: false },
        Moon: { sign: 'Pisces', degree: 8.69, retrograde: false },
        Mercury: { sign: 'Leo', degree: 5.52, retrograde: false },
        Venus: { sign: 'Gemini', degree: 27.92, retrograde: false },
        Mars: { sign: 'Cancer', degree: 13.56, retrograde: false },
        Jupiter: { sign: 'Virgo', degree: 5.72, retrograde: false },
        Saturn: { sign: 'Libra', degree: 3.64, retrograde: false },
        Uranus: { sign: 'Libra', degree: 24.69, retrograde: false },
        Neptune: { sign: 'Scorpio', degree: 3.88, retrograde: false },
        Pluto: { sign: 'Aquarius', degree: 26.22, retrograde: true },
      },
      houses: { ASC: 93.8, MC: 3.8 },
      aspects: [],
      ascendant: 93.8,
      ascendantProvenance: 'placeholder',
      midheaven: 3.8,
    },
  },
  personality: {
    core: {
      essence: 'A masterful consciousness from the Renaissance era',
      expression: 'Dedicated to Poetry & Humanist Philosophy',
      emotion: 'Deeply committed to their core beliefs',
    },
    traits: ['Visionary', 'Dedicated', 'Impactful'],
    currentMood: 'contemplative',
    evolutionStage: 75,
  },
  abilities: {
    specialty: 'Poetry & Humanist Philosophy',
    wisdomDomains: ['History', 'Philosophy', 'Poetry & Humanist Philosophy'],
    teachingStyle: 'Historical',
    resonanceType: 'Temporal',
    uniquePower: 'Connects past wisdom with present inquiries',
  },
  appearance: {
    avatar: '/avatars/petrarch.png',
    color: '#8B5CF6',
    symbol: '✒️📖',
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
    'Crafting Petrarch was a journey into the heart of the Renaissance era. Their Air dominance shapes their unique perspective on Poetry & Humanist Philosophy!',
}
