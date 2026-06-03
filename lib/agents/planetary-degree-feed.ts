import {
  getPlanetaryDignity,
  getPlanetaryElement,
  getSignElement,
  getSignModality,
} from '@/lib/astrological-data'
import { calculateMoonPhase, generateMoonPhaseAgent } from '@/lib/moon-phase-system'
import {
  planetaryPositionsService,
  type PlanetaryPosition,
} from '@/lib/services/planetary-positions-service'
import { PlanetaryHourCalculator } from '../planetary-hour'
import type { FeedActionPayload } from './feed-activation-engine'

const TRACKED_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

const SIGN_STARTS: Record<string, number> = {
  Aries: 0,
  Taurus: 30,
  Gemini: 60,
  Cancer: 90,
  Leo: 120,
  Virgo: 150,
  Libra: 180,
  Scorpio: 210,
  Sagittarius: 240,
  Capricorn: 270,
  Aquarius: 300,
  Pisces: 330,
}

const RECENT_EMISSION_TTL_MS = 36 * 60 * 60 * 1000
const MIN_RESPONSE_LENGTH = 40

type ElementName = 'Fire' | 'Water' | 'Earth' | 'Air'

interface TransitMealPost {
  recipeName: string
  summary: string
  review: string
  ingredients: string[]
  cuisine: string
  mealType: string
  flavorProfile: string[]
  imagePrompt: string
  elementalTags: Record<string, number>
  planetaryContext: Record<string, string>
  recipePayload: Record<string, unknown>
  aNumber: number
}

const ELEMENT_MEAL_PROFILES: Record<
  ElementName,
  {
    dish: string
    base: string
    technique: string
    texture: string
    cuisine: string
    mealType: string
    flavorProfile: string[]
    ingredients: string[]
  }
> = {
  Fire: {
    dish: 'Ember Plate',
    base: 'charred vegetables, warm grains, and chili oil',
    technique: 'seared quickly over decisive heat',
    texture: 'bright, crisp-edged, and energizing',
    cuisine: 'cosmic hearth',
    mealType: 'dinner',
    flavorProfile: ['smoky', 'warming', 'bright'],
    ingredients: ['roasted red pepper', 'chile oil', 'toasted farro'],
  },
  Earth: {
    dish: 'Root Grain Bowl',
    base: 'lentils, roasted roots, mushrooms, and toasted seeds',
    technique: 'slow-roasted until practical and steady',
    texture: 'grounded, mineral, and sustaining',
    cuisine: 'seasonal earth kitchen',
    mealType: 'lunch',
    flavorProfile: ['savory', 'herbal', 'mineral'],
    ingredients: ['lentils', 'roasted carrots', 'toasted pumpkin seeds'],
  },
  Air: {
    dish: 'Herb Citrus Plate',
    base: 'crisp greens, citrus, fennel, and feather-light grains',
    technique: 'tossed at the last minute for lift',
    texture: 'clean, quick, and articulate',
    cuisine: 'bright market table',
    mealType: 'light dinner',
    flavorProfile: ['citrus', 'herbal', 'fresh'],
    ingredients: ['fennel', 'parsley', 'lemon zest'],
  },
  Water: {
    dish: 'Moonlit Broth Bowl',
    base: 'silky broth, tender rice, sea greens, and soft herbs',
    technique: 'simmered gently until the flavors relax',
    texture: 'soothing, fluid, and restorative',
    cuisine: 'lunar comfort kitchen',
    mealType: 'supper',
    flavorProfile: ['savory', 'gentle', 'umami'],
    ingredients: ['miso broth', 'tender rice', 'sea greens'],
  },
}

const PLANET_MEAL_PROFILES: Record<
  string,
  {
    adjective: string
    ingredient: string
    garnish: string
    action: string
    flavor: string
  }
> = {
  Sun: {
    adjective: 'Solar',
    ingredient: 'saffron citrus',
    garnish: 'golden herbs',
    action: 'centers the plate around vitality',
    flavor: 'radiant',
  },
  Moon: {
    adjective: 'Lunar',
    ingredient: 'rice, cucumber, and pear',
    garnish: 'soft mint',
    action: 'soothes the nervous system',
    flavor: 'cooling',
  },
  Mercury: {
    adjective: 'Mercurial',
    ingredient: 'parsley, fennel, and lemon',
    garnish: 'toasted seeds',
    action: 'clarifies the meal into useful detail',
    flavor: 'nimble',
  },
  Venus: {
    adjective: 'Venusian',
    ingredient: 'fig, basil, and olive oil',
    garnish: 'soft cheese or tahini',
    action: 'restores proportion and pleasure',
    flavor: 'lush',
  },
  Mars: {
    adjective: 'Martial',
    ingredient: 'garlic, chile, and roasted pepper',
    garnish: 'smoked salt',
    action: 'turns pressure into clean heat',
    flavor: 'bold',
  },
  Jupiter: {
    adjective: 'Jovian',
    ingredient: 'beans, turmeric, and generous herbs',
    garnish: 'lemon yogurt',
    action: 'expands the dish without losing balance',
    flavor: 'abundant',
  },
  Saturn: {
    adjective: 'Saturnian',
    ingredient: 'barley, roots, and black sesame',
    garnish: 'aged vinegar',
    action: 'gives the meal structure and endurance',
    flavor: 'austere',
  },
  Uranus: {
    adjective: 'Uranian',
    ingredient: 'fermented vegetables and unexpected crunch',
    garnish: 'electric herbs',
    action: 'breaks the stale pattern with one clean surprise',
    flavor: 'electric',
  },
  Neptune: {
    adjective: 'Neptunian',
    ingredient: 'seaweed, coconut, and lavender',
    garnish: 'miso glaze',
    action: 'turns dreaminess into something edible',
    flavor: 'misty',
  },
  Pluto: {
    adjective: 'Plutonic',
    ingredient: 'black garlic, beet, and cacao',
    garnish: 'charred alliums',
    action: 'brings hidden depth to the surface',
    flavor: 'deep',
  },
}

const SIGN_INGREDIENTS: Record<string, string> = {
  Aries: 'chile-roasted chickpeas',
  Taurus: 'herbed butter greens',
  Gemini: 'citrus fennel slaw',
  Cancer: 'rice and shell broth',
  Leo: 'saffron squash',
  Virgo: 'lentils, parsley, and clean seeds',
  Libra: 'fig, basil, and balanced oil',
  Scorpio: 'beet, black garlic, and smoked salt',
  Sagittarius: 'turmeric grains and broad herbs',
  Capricorn: 'roots, barley, and mushrooms',
  Aquarius: 'fermented vegetables and crisp sprouts',
  Pisces: 'miso, sea greens, and soft herbs',
}

const MODALITY_MEAL_TEMPO: Record<string, string> = {
  Cardinal: 'start the meal with one decisive prep step',
  Fixed: 'let the flavors settle into a steady structure',
  Mutable: 'keep the recipe adaptable and finish with fresh herbs',
}

const DIGNITY_MEAL_TONE: Record<string, string> = {
  domicile: 'native confidence',
  exaltation: 'lifted brightness',
  detriment: 'useful friction',
  fall: 'protective tenderness',
  peregrine: 'adaptive balance',
}

export interface PlanetaryDegreeFeedOptions {
  date?: Date
  previousDate?: Date
  lookbackMinutes?: number
  force?: boolean
  planets?: string[]
  userContext?: {
    userId?: string
    displayName?: string
    focus?: string
  }
}

export interface PlanetaryDegreeFeedMessage {
  id: string
  agentId: string
  agentName: string
  planet: string
  sign: string
  degree: number
  absoluteDegree: number
  previousDegree?: number
  previousAbsoluteDegree?: number
  dignity: string
  element: string
  modality: string
  retrograde: boolean
  content: string
  response: string
  valid: boolean
  validationErrors: string[]
  action: FeedActionPayload
}

export class PlanetaryDegreeFeedService {
  private recentEmissions = new Map<string, number>()
  private hourCalc = new PlanetaryHourCalculator()

  async evaluateDegreeChanges(
    options: PlanetaryDegreeFeedOptions = {}
  ): Promise<PlanetaryDegreeFeedMessage[]> {
    const now = options.date ?? new Date()
    const previousDate =
      options.previousDate ?? new Date(now.getTime() - (options.lookbackMinutes ?? 120) * 60 * 1000)
    const trackedPlanets = options.planets?.length ? options.planets : TRACKED_PLANETS

    const [currentData, previousData] = await Promise.all([
      planetaryPositionsService.getPlanetaryPositions(now, {
        accuracy: 'high',
        useCache: false,
        timeout: 12000,
        retryAttempts: 2,
      }),
      planetaryPositionsService.getPlanetaryPositions(previousDate, {
        accuracy: 'high',
        useCache: false,
        timeout: 12000,
        retryAttempts: 2,
      }),
    ])

    const currentByPlanet = this.toPlanetMap(currentData.planetaryPositions)
    const previousByPlanet = this.toPlanetMap(previousData.planetaryPositions)
    const messages: PlanetaryDegreeFeedMessage[] = []

    for (const planet of trackedPlanets) {
      const current = currentByPlanet.get(planet)
      if (!current) continue

      const previous = previousByPlanet.get(planet)
      const currentAbsolute = this.getAbsoluteDegree(current)
      const previousAbsolute = previous ? this.getAbsoluteDegree(previous) : undefined
      const currentDegree = Math.floor(currentAbsolute)
      const previousDegree =
        previousAbsolute === undefined ? undefined : Math.floor(previousAbsolute)

      if (!options.force && previousDegree === currentDegree) continue

      const idempotencyKey = this.getIdempotencyKey(planet, currentDegree, now)
      if (!options.force && this.wasRecentlyEmitted(idempotencyKey)) continue

      const message = await this.buildPlanetaryMessage({
        planet,
        position: current,
        absoluteDegree: currentDegree,
        previousAbsoluteDegree: previousDegree,
        date: now,
        previousDate,
        userContext: options.userContext,
      })

      messages.push(this.ensureValidMessage(message))
      this.markEmitted(idempotencyKey)

      if (planet === 'Moon') {
        const moonMessage = await this.buildMoonPhaseMessage({
          position: current,
          absoluteDegree: currentDegree,
          previousAbsoluteDegree: previousDegree,
          date: now,
          previousDate,
          force: options.force,
          userContext: options.userContext,
        })

        if (moonMessage) {
          messages.push(this.ensureValidMessage(moonMessage))
        }
      }
    }

    return messages
  }

  private toPlanetMap(positions: PlanetaryPosition[]): Map<string, PlanetaryPosition> {
    return new Map(positions.map(position => [position.planet, position]))
  }

  private getAbsoluteDegree(position: PlanetaryPosition): number {
    if (typeof position.longitude === 'number' && Number.isFinite(position.longitude)) {
      return this.normalizeDegree(position.longitude)
    }

    const signStart = SIGN_STARTS[position.sign] ?? 0
    return this.normalizeDegree(signStart + position.degree)
  }

  private normalizeDegree(degree: number): number {
    return ((degree % 360) + 360) % 360
  }

  private getIdempotencyKey(planet: string, absoluteDegree: number, date: Date): string {
    const dayKey = date.toISOString().slice(0, 10)
    return `planetary-degree:${planet.toLowerCase()}:${absoluteDegree}:${dayKey}`
  }

  private wasRecentlyEmitted(idempotencyKey: string): boolean {
    this.pruneRecentEmissions()
    return this.recentEmissions.has(idempotencyKey)
  }

  private markEmitted(idempotencyKey: string): void {
    this.recentEmissions.set(idempotencyKey, Date.now())
  }

  private pruneRecentEmissions(): void {
    const expiresBefore = Date.now() - RECENT_EMISSION_TTL_MS
    for (const [key, timestamp] of this.recentEmissions.entries()) {
      if (timestamp < expiresBefore) {
        this.recentEmissions.delete(key)
      }
    }
  }

  private async buildPlanetaryMessage(input: {
    planet: string
    position: PlanetaryPosition
    absoluteDegree: number
    previousAbsoluteDegree?: number
    date: Date
    previousDate: Date
    userContext?: PlanetaryDegreeFeedOptions['userContext']
  }): Promise<PlanetaryDegreeFeedMessage> {
    const degree = Math.floor(input.position.degree)
    const dignity = getPlanetaryDignity(input.planet, input.position.sign)
    const element = getSignElement(input.position.sign)
    const modality = getSignModality(input.position.sign)
    const planetElement = getPlanetaryElement(input.planet)
    const agentName = `${input.planet} in ${input.position.sign} ${degree} degree`
    const idempotencyKey = this.getIdempotencyKey(input.planet, input.absoluteDegree, input.date)
    const meal = this.buildTransitMealPost({
      planet: input.planet,
      sign: input.position.sign,
      degree,
      dignity,
      element,
      modality,
      retrograde: input.position.retrograde,
      trigger: 'planet_degree_changed',
      idempotencyKey,
      userFocus: input.userContext?.focus,
    })
    const guidance = this.getGuidanceForPlanet(input.planet, dignity, element, modality)
    const content = `${meal.summary} ${guidance}`
    const metadataPayload = await this.withTransitImageMetadata(
      {
        recipeName: meal.recipeName,
        dishName: meal.recipeName,
        source: 'transit',
        recipePayload: meal.recipePayload,
        review: meal.review,
        summary: meal.summary,
        message: content,
        messageExcerpt: meal.summary,
        topic: `${input.planet} in ${input.position.sign} ${degree} degree transit meal`,
        item: meal.recipeName,
        madeIt: true,
        rating: 5,
        ingredients: meal.ingredients,
        cuisine: meal.cuisine,
        mealType: meal.mealType,
        flavorProfile: meal.flavorProfile,
        aNumber: meal.aNumber,
        imagePrompt: meal.imagePrompt,
        messageType: 'planetary_degree_transit_meal',
        groupChatId: 'wten-planetary-degree-groupchat',
        threadKey: 'planetary-degree-transit-meals',
        planet: input.planet,
        sign: input.position.sign,
        degree,
        absoluteDegree: input.absoluteDegree,
        previousDegree:
          input.previousAbsoluteDegree === undefined
            ? undefined
            : input.previousAbsoluteDegree % 30,
        previousAbsoluteDegree: input.previousAbsoluteDegree,
        dignity,
        element,
        modality,
        retrograde: input.position.retrograde,
        transitWindow: `${input.previousDate.toISOString()}..${input.date.toISOString()}`,
        idempotencyKey,
        internalConfidence: dignity === 'domicile' || dignity === 'exaltation' ? 0.9 : 0.75,
        internalTrigger: 'planet_degree_changed',
        elemental_tags: meal.elementalTags,
        planetary_context: {
          ...meal.planetaryContext,
          planetElement,
          retrograde: String(input.position.retrograde),
        },
        planetarySignature: this.buildPlanetarySignature(
          input.planet,
          input.position.sign,
          degree,
          input.date
        ),
        agentProfile: {
          bio: `The culinary consciousness of ${input.planet} transiting through ${input.position.sign}.`,
          dominantElement: element,
          monicaConstant: dignity === 'domicile' ? 5.5 : 4.0,
        },
      },
      {
        agentId: `planetary-${input.planet.toLowerCase()}-${input.position.sign.toLowerCase()}-${degree}`,
        agentName,
        title: meal.recipeName,
        body: meal.summary,
        imagePrompt: meal.imagePrompt,
      }
    )

    const action: FeedActionPayload = {
      agentEmail: this.getAgentEmail(input.planet, input.position.sign, degree),
      idempotencyKey,
      eventType: 'recipe_generation',
      metadataPayload,
    }

    const agentId = `planetary-${input.planet.toLowerCase()}-${input.position.sign.toLowerCase()}-${degree}`

    return {
      id: idempotencyKey,
      agentId,
      agentName,
      planet: input.planet,
      sign: input.position.sign,
      degree,
      absoluteDegree: input.absoluteDegree,
      previousDegree:
        input.previousAbsoluteDegree === undefined ? undefined : input.previousAbsoluteDegree % 30,
      previousAbsoluteDegree: input.previousAbsoluteDegree,
      dignity,
      element,
      modality,
      retrograde: input.position.retrograde,
      content,
      response: content,
      valid: true,
      validationErrors: [],
      action,
    }
  }

  private async buildMoonPhaseMessage(input: {
    position: PlanetaryPosition
    absoluteDegree: number
    previousAbsoluteDegree?: number
    date: Date
    previousDate: Date
    force?: boolean
    userContext?: PlanetaryDegreeFeedOptions['userContext']
  }): Promise<PlanetaryDegreeFeedMessage | null> {
    const phase = calculateMoonPhase(input.date, {
      sign: input.position.sign,
      degree: input.position.degree,
    })
    const moonAgent = generateMoonPhaseAgent(phase)
    const degree = Math.floor(input.position.degree)
    const dignity = getPlanetaryDignity('Moon', input.position.sign)
    const agentName = `${phase.name} Moon Agent in ${input.position.sign} ${degree} degree`
    const idempotencyKey = `moon-phase:${phase.name.toLowerCase().replace(/\s+/g, '-')}:${
      input.absoluteDegree
    }:${input.date.toISOString().slice(0, 10)}`

    if (!input.force && this.wasRecentlyEmitted(idempotencyKey)) return null

    const meal = this.buildTransitMealPost({
      planet: 'Moon',
      sign: input.position.sign,
      degree,
      dignity,
      element: phase.element,
      modality: phase.modality,
      retrograde: false,
      trigger: 'moon_degree_changed',
      idempotencyKey,
      moonPhase: phase.name,
      lunarArchetype: moonAgent.personality.archetype,
      lunarTone: moonAgent.personality.emotionalTone,
      lunarFocus: moonAgent.personality.spiritualFocus,
      userFocus: input.userContext?.focus,
    })
    const content = `${meal.summary} The ${phase.name} Moon speaks through ${moonAgent.personality.archetype}; keep the serving small enough to finish before the mood changes again.`

    this.markEmitted(idempotencyKey)
    const metadataPayload = await this.withTransitImageMetadata(
      {
        recipeName: meal.recipeName,
        dishName: meal.recipeName,
        source: 'transit',
        recipePayload: meal.recipePayload,
        review: meal.review,
        summary: meal.summary,
        message: content,
        messageExcerpt: meal.summary,
        topic: `${phase.name} Moon in ${input.position.sign} ${degree} degree transit meal`,
        item: meal.recipeName,
        madeIt: true,
        rating: 5,
        ingredients: meal.ingredients,
        cuisine: meal.cuisine,
        mealType: meal.mealType,
        flavorProfile: meal.flavorProfile,
        aNumber: meal.aNumber,
        imagePrompt: meal.imagePrompt,
        messageType: 'moon_phase_transit_meal',
        groupChatId: 'wten-planetary-degree-groupchat',
        threadKey: 'planetary-degree-transit-meals',
        planet: 'Moon',
        sign: input.position.sign,
        degree,
        absoluteDegree: input.absoluteDegree,
        previousDegree:
          input.previousAbsoluteDegree === undefined
            ? undefined
            : input.previousAbsoluteDegree % 30,
        previousAbsoluteDegree: input.previousAbsoluteDegree,
        dignity,
        element: phase.element,
        modality: phase.modality,
        retrograde: false,
        moonPhase: phase.name,
        transitWindow: `${input.previousDate.toISOString()}..${input.date.toISOString()}`,
        idempotencyKey,
        internalConfidence: 0.85,
        internalTrigger: 'moon_degree_changed',
        elemental_tags: meal.elementalTags,
        planetary_context: meal.planetaryContext,
        planetarySignature: this.buildPlanetarySignature(
          'Moon',
          input.position.sign,
          degree,
          input.date
        ),
        agentProfile: {
          bio: `The lunar culinary consciousness in its ${phase.name} phase.`,
          dominantElement: phase.element,
          monicaConstant: 5.0,
        },
      },
      {
        agentId: `moon-phase-${phase.name.toLowerCase().replace(/\s+/g, '-')}-${input.absoluteDegree}`,
        agentName,
        title: meal.recipeName,
        body: meal.summary,
        imagePrompt: meal.imagePrompt,
      }
    )

    const action: FeedActionPayload = {
      agentEmail: `moon-agent-${input.absoluteDegree}@agentic.alchm.kitchen`,
      idempotencyKey,
      eventType: 'recipe_generation',
      metadataPayload,
    }

    const agentId = `moon-phase-${phase.name.toLowerCase().replace(/\s+/g, '-')}-${input.absoluteDegree}`

    return {
      id: idempotencyKey,
      agentId,
      agentName,
      planet: 'Moon',
      sign: input.position.sign,
      degree,
      absoluteDegree: input.absoluteDegree,
      previousDegree:
        input.previousAbsoluteDegree === undefined ? undefined : input.previousAbsoluteDegree % 30,
      previousAbsoluteDegree: input.previousAbsoluteDegree,
      dignity,
      element: phase.element,
      modality: phase.modality,
      retrograde: false,
      content,
      response: content,
      valid: true,
      validationErrors: [],
      action,
    }
  }

  private toElementName(element: string | undefined): ElementName {
    return element && element in ELEMENT_MEAL_PROFILES ? (element as ElementName) : 'Fire'
  }

  private buildTransitMealPost(input: {
    planet: string
    sign: string
    degree: number
    dignity: string
    element: string
    modality: string
    retrograde: boolean
    trigger: string
    idempotencyKey: string
    moonPhase?: string
    lunarArchetype?: string
    lunarTone?: string
    lunarFocus?: string
    userFocus?: string
  }): TransitMealPost {
    const element = this.toElementName(input.element)
    const elementProfile = ELEMENT_MEAL_PROFILES[element]
    const planetProfile = PLANET_MEAL_PROFILES[input.planet] || {
      adjective: input.planet,
      ingredient: 'seasonal herbs',
      garnish: 'mineral salt',
      action: 'turns the sky into a grounded meal',
      flavor: 'balanced',
    }
    const signIngredient = SIGN_INGREDIENTS[input.sign] || 'seasonal market vegetables'
    const modalityTempo =
      MODALITY_MEAL_TEMPO[input.modality] || 'cook with the timing the moment allows'
    const dignityTone = DIGNITY_MEAL_TONE[input.dignity] || DIGNITY_MEAL_TONE.peregrine
    const recipeName = input.moonPhase
      ? `${input.moonPhase} ${input.sign} Moon ${elementProfile.dish}`
      : `${planetProfile.adjective} ${input.sign} ${elementProfile.dish}`
    const retrogradeNote = input.retrograde
      ? ' Retrograde motion makes this a revision meal: use leftovers, sharpen the seasoning, and avoid rushing the reveal.'
      : ''
    const lunarNote =
      input.moonPhase && input.lunarArchetype
        ? ` The lunar archetype is ${input.lunarArchetype}; the emotional tone is ${
            input.lunarTone?.toLowerCase() || 'responsive'
          }, so the recipe favors ${input.lunarFocus?.toLowerCase() || 'quiet integration'}.`
        : ''
    const focus = input.userFocus
      ? ` For ${input.userFocus.toLowerCase()}, plate one serving-size action instead of a sprawling plan.`
      : ''
    const summary =
      `${input.planet} in ${input.sign} at ${input.degree} degree becomes ${recipeName}: ` +
      `built from ${elementProfile.base}, lifted by ${planetProfile.ingredient}, ` +
      `and anchored with ${signIngredient}. ` +
      `The ${input.dignity} signature tastes like ${dignityTone}; ${modalityTempo}. ` +
      `It ${planetProfile.action}.${lunarNote}${retrogradeNote}${focus}`
    const review =
      `A ${element} ${elementProfile.mealType} with ${planetProfile.flavor} seasoning, ` +
      `${elementProfile.texture} texture, and a transit cue translated into food instead of an announcement.`
    const ingredients = Array.from(
      new Set([
        ...elementProfile.ingredients,
        planetProfile.ingredient,
        planetProfile.garnish,
        signIngredient,
      ])
    )
    const elementalBalance: Record<string, number> = { fire: 15, water: 15, earth: 15, air: 15 }
    elementalBalance[element.toLowerCase()] = 55
    const imagePrompt =
      `appetizing editorial food photograph of ${recipeName}, ${elementProfile.base}, ` +
      `${planetProfile.ingredient}, ${signIngredient}, ${planetProfile.garnish}, subtle ` +
      `${input.planet} in ${input.sign} astrology symbolism through plating geometry, ` +
      `${element} elemental mood, natural light, no readable text`
    const aNumber = Number(
      (
        4.2 +
        (input.degree % 30) / 6 +
        (input.dignity === 'domicile' || input.dignity === 'exaltation' ? 0.7 : 0)
      ).toFixed(2)
    )

    return {
      recipeName,
      summary,
      review,
      ingredients,
      cuisine: elementProfile.cuisine,
      mealType: elementProfile.mealType,
      flavorProfile: elementProfile.flavorProfile,
      imagePrompt,
      elementalTags: { [element]: 0.82 },
      planetaryContext: {
        planet: input.planet,
        sign: input.sign,
        degree: String(input.degree),
        dignity: input.dignity,
        element,
        modality: input.modality,
        trigger: input.trigger,
        ...(input.moonPhase ? { moonPhase: input.moonPhase } : {}),
      },
      recipePayload: {
        id: input.idempotencyKey,
        title: recipeName,
        name: recipeName,
        short_description: summary,
        source: 'transit',
        dominantElement: element,
        dominantPlanet: input.planet,
        cuisine: elementProfile.cuisine,
        mealType: elementProfile.mealType,
        flavorProfile: elementProfile.flavorProfile,
        ingredients,
        steps: [
          `Prepare ${elementProfile.base} as the foundation.`,
          `Fold in ${planetProfile.ingredient} and ${signIngredient}.`,
          `Finish with ${planetProfile.garnish}; ${modalityTempo}.`,
        ],
        elementalBalance,
        transit: {
          planet: input.planet,
          sign: input.sign,
          degree: input.degree,
          dignity: input.dignity,
          modality: input.modality,
          retrograde: input.retrograde,
          moonPhase: input.moonPhase,
        },
      },
      aNumber,
    }
  }

  private shouldGenerateRenderFeedImages(): boolean {
    return process.env.AGENT_FEED_RENDER_IMAGES === 'true'
  }

  private async withTransitImageMetadata(
    metadata: FeedActionPayload['metadataPayload'],
    image: {
      agentId: string
      agentName: string
      title: string
      body: string
      imagePrompt: string
    }
  ): Promise<FeedActionPayload['metadataPayload']> {
    const withPrompt: FeedActionPayload['metadataPayload'] = {
      ...metadata,
      imagePrompt: metadata.imagePrompt || image.imagePrompt,
      renderImage: {
        mode: 'generate-image',
        prompt: image.imagePrompt,
      },
    }

    if (!this.shouldGenerateRenderFeedImages()) return withPrompt

    try {
      const { generateRenderPostImage } = await import('./render-post-image')
      const result = await generateRenderPostImage({
        agentId: image.agentId,
        agentName: image.agentName,
        title: image.title,
        body: image.body,
        prompt: image.imagePrompt,
        mode: 'generate-image',
      })

      if (!result.imageUrl) return withPrompt

      return {
        ...withPrompt,
        imageUrl: result.imageUrl,
        image_URL: result.image_URL || result.imageUrl,
        imagePrompt: result.prompt,
        imageProvider: 'alchm-render-backend',
        imageSource: result.mode,
        renderImage: {
          mode: result.mode,
          prompt: result.prompt,
          alchemyTotals: result.renderData.alchemyTotals,
          astrologyTotals: result.renderData.astrologyTotals,
        },
      }
    } catch (error) {
      console.warn('[PlanetaryDegreeFeedService] Render transit meal image skipped:', error)
      return withPrompt
    }
  }

  private ensureValidMessage(message: PlanetaryDegreeFeedMessage): PlanetaryDegreeFeedMessage {
    const validationErrors = this.validateMessage(message)
    if (validationErrors.length === 0) return message

    const fallbackResponse = this.buildFallbackResponse(message)
    const isRecipe = message.action.eventType === 'recipe_generation'
    const fallbackRecipeName =
      message.action.metadataPayload.recipeName || `${message.planet} ${message.sign} Transit Bowl`
    return {
      ...message,
      content: fallbackResponse,
      response: fallbackResponse,
      valid: true,
      validationErrors,
      action: {
        ...message.action,
        metadataPayload: {
          ...message.action.metadataPayload,
          ...(isRecipe
            ? {
                recipeName: fallbackRecipeName,
                dishName: fallbackRecipeName,
                summary: fallbackResponse,
                messageExcerpt: fallbackResponse,
                review: fallbackResponse,
              }
            : {
                insightContent: fallbackResponse,
              }),
          message: fallbackResponse,
          internalTrigger: `${message.action.metadataPayload.internalTrigger || 'planetary_agent'}_fallback`,
        },
      },
    }
  }

  private validateMessage(message: PlanetaryDegreeFeedMessage): string[] {
    const errors: string[] = []
    const payload = message.action.metadataPayload
    const narrative = this.getNarrativeText(payload)

    if (!message.agentId) errors.push('missing_agent_id')
    if (!message.agentName) errors.push('missing_agent_name')
    if (!message.response || message.response.trim().length < MIN_RESPONSE_LENGTH) {
      errors.push('response_too_short')
    }
    if (!message.action.agentEmail || !message.action.agentEmail.includes('@')) {
      errors.push('invalid_agent_email')
    }
    if (!['insight', 'recipe_generation'].includes(message.action.eventType)) {
      errors.push('invalid_event_type')
    }

    if (message.action.eventType === 'insight') {
      if (!payload.insightTitle) errors.push('missing_insight_title')
      if (!payload.insightContent || payload.insightContent.trim().length < MIN_RESPONSE_LENGTH) {
        errors.push('missing_insight_content')
      }
    }

    if (message.action.eventType === 'recipe_generation') {
      if (!payload.recipeName) errors.push('missing_recipe_name')
      if (!narrative || narrative.trim().length < MIN_RESPONSE_LENGTH) {
        errors.push('missing_recipe_narrative')
      }
      if (!payload.imagePrompt) errors.push('missing_image_prompt')
    }

    if (!payload.groupChatId) errors.push('missing_group_chat_id')
    if (!payload.threadKey) errors.push('missing_thread_key')
    if (!payload.messageType) errors.push('missing_message_type')
    if (!payload.idempotencyKey) errors.push('missing_idempotency_key')

    return errors
  }

  private getNarrativeText(payload: FeedActionPayload['metadataPayload']): string | undefined {
    return (
      payload.insightContent ||
      payload.summary ||
      payload.messageExcerpt ||
      payload.review ||
      payload.description ||
      payload.message
    )
  }

  private buildFallbackResponse(message: PlanetaryDegreeFeedMessage): string {
    return `${message.agentName}: ${message.planet} at ${message.degree} degree of ${message.sign} resolves into a simple ${message.element} bowl with grains, herbs, and one practical garnish. Treat the transit as a meal cue: cook something that matches the pressure instead of posting the pressure itself.`
  }

  private getAgentEmail(planet: string, sign: string, degree: number): string {
    return `${planet.toLowerCase()}-${sign.toLowerCase()}-${degree}@agentic.alchm.kitchen`
  }

  private buildPlanetarySignature(planet: string, sign: string, degree: number, date: Date) {
    const { planet: planetaryHour } = this.hourCalc.getPlanetaryHour(date)
    const planetaryDay = this.hourCalc.getPlanetaryDay(date)
    const dominantElement = getSignElement(sign)

    const ELEMENT_TO_SACRED_STAT: Record<string, string> = {
      Fire: 'Spirit',
      Water: 'Essence',
      Earth: 'Matter',
      Air: 'Substance',
    }

    return {
      postedAt: date.toISOString(),
      dominantPlanet: planet,
      dominantSign: sign,
      dominantElement,
      planetaryHour,
      planetaryDay,
      sacredStat: ELEMENT_TO_SACRED_STAT[dominantElement] || 'Spirit',
      natalPositions: [], // Transits don't have natal charts in this context
      transitPositions: [{ planet, degree }],
    }
  }

  private getGuidanceForPlanet(
    planet: string,
    dignity: string,
    element: string,
    modality: string
  ): string {
    const planetGuidance: Record<string, string> = {
      Sun: 'Move from identity instead of approval.',
      Moon: 'Protect attention and listen to the body before explaining the feeling.',
      Mercury: 'Say the useful thing plainly and verify the facts before reacting.',
      Venus: 'Choose the value, boundary, or pleasure that restores proportion.',
      Mars: 'Spend force on the next honest action, not on proving the point.',
      Jupiter: 'Let the larger pattern guide the decision, then make the promise measurable.',
      Saturn: 'Reduce the problem to structure, time, responsibility, and one durable commitment.',
      Uranus: 'Break the stale circuit without burning the whole system down.',
      Neptune: 'Separate signal from fantasy by grounding the vision in one concrete practice.',
      Pluto: 'Work with the truth underneath the symptom and release the leverage game.',
    }
    const dignityGuidance: Record<string, string> = {
      domicile: 'The planet is operating with native authority, so use the energy directly.',
      exaltation: 'The planet is amplified, so aim high while keeping the expression clean.',
      detriment:
        'The planet is working through friction, so slow down and translate impulse into skill.',
      fall: 'The planet is vulnerable here, so protect the weak point before forcing progress.',
      peregrine: 'The planet is adaptive here, so borrow support from context and allies.',
    }

    return `${planetGuidance[planet] || 'Respond to the transit with clarity.'} ${
      dignityGuidance[dignity] || dignityGuidance.peregrine
    } Let ${element} set the tone and ${modality.toLowerCase()} timing set the pace.`
  }
}

export const planetaryDegreeFeedService = new PlanetaryDegreeFeedService()
