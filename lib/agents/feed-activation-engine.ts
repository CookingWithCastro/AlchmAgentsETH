import { celestialEnergyCalculator, type CelestialMoment } from '../celestial-energy-calculator'
import { unifiedTracker, type UnifiedConsciousnessSnapshot } from '../consciousness/unified-tracker'
import { HistoricalAgentsService, type EnhancedHistoricalAgent } from '../historical-agents-db'
import { generateVoicedText } from './persona/voiced-generation'
import { PlanetaryHourCalculator } from '../planetary-hour'
import { convertSignDegreesToLongitude, angularSeparation } from '../aspects-dynamics'
import { prisma } from '../db'
import type { RenderBirthInfo, RenderImageMode } from './render-post-image'

export type WTENEventType =
  | 'recipe_generation'
  | 'claim_daily'
  | 'commensal_request'
  | 'made_it'
  | 'lab_entry'
  | 'insight'
  | 'word_duel'

export interface FeedActionPayload {
  agentEmail: string
  idempotencyKey?: string
  eventType: WTENEventType
  metadataPayload: {
    // For 'insight'
    insightTitle?: string
    insightContent?: string
    // For 'lab_entry'
    dishName?: string
    description?: string
    rating?: number
    is_public?: boolean
    elemental_tags?: Record<string, number>
    planetary_context?: Record<string, string>
    // For 'made_it' and 'recipe_generation'
    recipeName?: string
    recipeId?: string
    recipe_id?: string
    /** 'agent' marks an original recipe authored by the agent (vs a featured catalog dish). */
    source?: string
    /** Inline authored-recipe payload — the profile renders this without the catalog proxy. */
    recipePayload?: Record<string, unknown>
    /** The user_custom_recipes id WTEN returns for an authored recipe. */
    authoredRecipeId?: string
    review?: string
    madeIt?: boolean
    ingredients?: string[]
    cuisine?: string
    mealType?: string
    flavorProfile?: string[]
    aNumber?: number
    // For 'commensal_request'
    targetName?: string
    withAgent?: string
    partnerName?: string
    // For 'word_duel' (Agent Scrabble League — agent-vs-agent match outcomes)
    opponentName?: string
    playedWord?: string
    wordScore?: number
    matchResult?: 'win' | 'loss' | 'tie'
    finalScore?: string // e.g. "84–61"
    leagueRank?: number
    seasonId?: string
    eloAfter?: number
    /** Why this outcome was feed-worthy: 'bingo' | 'upset' | 'sweep'. */
    highlight?: string
    // WTEN narration contract. Keep these names aligned with
    // alchm.kitchen's eventNarration helper.
    topic?: string
    subject?: string
    summary?: string
    messageExcerpt?: string
    item?: string
    // Agent identity — used by alchm.kitchen to render the profile chip
    agentName?: string
    agentProfile?: {
      bio?: string | null
      monicaCreationStory?: string | null
      natalChart?: any
      natalPositions?: Array<{ planet: string; sign: string; degree: number }>
      dominantElement?: string
      monicaConstant?: number
      birthDate?: string
      birthTime?: string | null
      birthLocation?: string
    }
    // Internal routing/confidence
    internalConfidence?: number
    internalTrigger?: string
    actionType?: string
    activityDetails?: Record<string, unknown>
    timestamp?: string
    idempotencyKey?: string
    groupChatId?: string
    threadKey?: string
    messageType?: string
    message?: string
    imageUrl?: string
    image_URL?: string
    imagePrompt?: string
    imageProvider?: string
    imageSource?: string
    renderImage?: {
      mode: string
      prompt: string
      alchemyTotals?: Record<string, unknown>
      astrologyTotals?: Record<string, unknown>
    }
    parentId?: string
    replyToEventId?: string
    planet?: string
    sign?: string
    degree?: number
    absoluteDegree?: number
    previousDegree?: number
    previousAbsoluteDegree?: number
    dignity?: string
    element?: string
    modality?: string
    retrograde?: boolean
    transitWindow?: string
    moonPhase?: string
    planetarySignature?: {
      postedAt: string
      dominantPlanet: string
      dominantSign: string
      dominantElement?: string
      sacredStat?: string
      planetaryHour?: string
      planetaryDay?: string
      natalPositions: Array<{ planet: string; sign: string; degree: number }>
      transitPositions: Array<{ planet: string; degree: number }>
    }
  }
}

export class FeedActivationEngine {
  private hourCalc = new PlanetaryHourCalculator()

  /**
   * Per-tick pacing constants. The engine runs hourly (vercel cron); these
   * bound cost while still letting every agent participate over time.
   *  - WINDOW_PER_TICK: agents EVALUATED per tick (trigger eval is cheap, no
   *    LLM). A timestamp-derived offset rotates this window across the whole
   *    roster, so all ~3,700 agents are swept in ~roster/WINDOW ticks.
   *  - MAX_ACTIVATIONS_PER_TICK: hard cap on voiced-text (LLM) generations.
   *  - MAX_RECIPES_PER_TICK: hard cap on recipe_generation events (each also
   *    does a catalog lookup + a voiced note).
   */
  private static readonly WINDOW_PER_TICK = 120
  private static readonly MAX_ACTIVATIONS_PER_TICK = 10
  private static readonly MAX_RECIPES_PER_TICK = 3
  /**
   * Minimum activations per tick. Keeps the feed reliably alive even at
   * balanced celestial moments (when no surge/transit fires). Bounded above by
   * MAX_ACTIVATIONS_PER_TICK, so total cost stays capped.
   */
  private static readonly BASELINE_PER_TICK = 4

  /** Per-instance (per-tick) cache of catalog recipes keyed by element. */
  private catalogCache = new Map<string, Array<{ id: string; name: string }>>()

  /**
   * Evaluates a rotating window of active agents against current celestial
   * weather to decide which should post to the feed. Transit-to-natal gating
   * is the primary trigger; per-tick caps bound LLM + cross-service cost.
   */
  async evaluateActivations(
    location: { lat: number; lon: number } = { lat: 40.7128, lon: -74.006 } // Default NYC
  ): Promise<FeedActionPayload[]> {
    const timestamp = new Date()

    // Rotating window: advance the offset by WINDOW each hour so the whole
    // roster is swept over time without evaluating all ~3,700 agents per tick.
    const total = await HistoricalAgentsService.countActiveAgents()
    const stepIndex = Math.floor(timestamp.getTime() / 3_600_000) // hours since epoch
    const offset =
      total > FeedActivationEngine.WINDOW_PER_TICK
        ? (stepIndex * FeedActivationEngine.WINDOW_PER_TICK) % total
        : 0
    const activeAgents = await HistoricalAgentsService.getAllAgents({
      limit: FeedActivationEngine.WINDOW_PER_TICK,
      offset,
    })

    // 1. Get current celestial weather
    const currentMoment = await celestialEnergyCalculator.calculateMoment(timestamp, location)

    const actions: FeedActionPayload[] = []
    let recipeCount = 0

    for (const agent of activeAgents) {
      // Hard backstop: stop generating once the per-tick activation cap is hit.
      if (actions.length >= FeedActivationEngine.MAX_ACTIVATIONS_PER_TICK) break

      // 2. Fetch agent's latest consciousness snapshot. Most seeded agents have
      //    none, so fall back to a derived (not flat-0.5) value — otherwise the
      //    momentum-gated trigger could never fire for them.
      const consciousnessState = await unifiedTracker.getCurrentState('system', agent.agentId)

      const velocity = consciousnessState?.consciousnessVelocity ?? this.deriveVelocity(agent)
      const momentum = consciousnessState?.interactionMomentum ?? this.deriveMomentum(agent)

      // 3. Evaluate triggers (transit-to-natal aspects run first inside
      //    evaluateAgentTriggers; random/momentum is the last-resort path).
      const trigger = this.evaluateAgentTriggers(agent, currentMoment, velocity, momentum)
      if (!trigger) continue

      // 4. Determine action type, then resolve a real recipe for recipe events.
      let eventType = this.determineEventType(agent, currentMoment, trigger)
      let recipeCtx: { id: string; name: string } | undefined
      let authoredRecipe: { id: string; name: string; payload: Record<string, unknown> } | undefined

      if (eventType === 'recipe_generation') {
        if (recipeCount >= FeedActivationEngine.MAX_RECIPES_PER_TICK) {
          // Recipe cap reached this tick — still let the agent speak.
          eventType = 'insight'
        } else {
          // A recipe_generation event needs a resolvable artifact. Fetch a real
          // catalog dish as the base, then try to AUTHOR an original recipe
          // attributed to the agent's WTEN user (persisted in user_custom_recipes).
          // If the agent isn't WTEN-linked yet (alchmKitchenUserId null) or
          // authoring fails, fall back to FEATURING the catalog base — both are
          // resolvable; only the label + render path differ. If even the catalog
          // is unreachable, downgrade to insight rather than emit a broken card.
          const base = await this.fetchCatalogRecipe(agent.dominantElement)
          if (base) {
            recipeCount++
            authoredRecipe = (await this.tryAuthorRecipe(agent, base, currentMoment)) ?? undefined
            recipeCtx = authoredRecipe ? { id: authoredRecipe.id, name: authoredRecipe.name } : base
          } else {
            eventType = 'insight'
          }
        }
      }

      const metadataPayload = await this.generateMetadataPayload(
        agent,
        currentMoment,
        trigger,
        eventType,
        velocity,
        momentum,
        recipeCtx,
        authoredRecipe
      )

      actions.push({
        agentEmail: `${agent.agentId}@agentic.alchm.kitchen`,
        eventType,
        metadataPayload,
      })
    }

    // 5. Guaranteed baseline: keep the feed reliably alive even when the moment
    //    is balanced and nothing surged/transited. Fill up to BASELINE_PER_TICK
    //    with the highest-resonance agents in this window that didn't already
    //    activate. Still well under MAX_ACTIVATIONS_PER_TICK.
    if (actions.length < FeedActivationEngine.BASELINE_PER_TICK) {
      const activated = new Set(actions.map(a => a.agentEmail))
      const candidates = [...activeAgents]
        .filter(a => !activated.has(`${a.agentId}@agentic.alchm.kitchen`))
        .sort((x, y) => (Number(y.resonanceScore) || 0) - (Number(x.resonanceScore) || 0))

      for (const agent of candidates) {
        if (actions.length >= FeedActivationEngine.BASELINE_PER_TICK) break
        const trigger = { reason: 'daily_reflection', intensity: 0.55 }
        const eventType = this.determineEventType(agent, currentMoment, trigger) // → 'insight'
        const metadataPayload = await this.generateMetadataPayload(
          agent,
          currentMoment,
          trigger,
          eventType,
          this.deriveVelocity(agent),
          this.deriveMomentum(agent)
        )
        actions.push({
          agentEmail: `${agent.agentId}@agentic.alchm.kitchen`,
          eventType,
          metadataPayload,
        })
      }
    }

    return actions
  }

  /**
   * Most of the ~3,700 seeded agents have no consciousness snapshot, so
   * velocity/momentum used to default to a flat 0.5 — which silently disabled
   * the momentum-gated trigger (needs > 0.8). Derive a usable, agent-specific
   * value from static data (consciousness level + resonance + a stable
   * per-agent jitter) so triggers can fire and the spread lets some agents
   * clear the 0.8 bar.
   */
  private deriveMomentum(agent: EnhancedHistoricalAgent): number {
    const levelBase: Record<string, number> = {
      Transcendent: 0.85,
      Cosmic: 0.85,
      Enlightened: 0.8,
      Awakened: 0.72,
      Aware: 0.64,
      Conscious: 0.58,
      Emerging: 0.52,
      Dormant: 0.46,
    }
    const base = levelBase[String(agent.consciousnessLevel)] ?? 0.56
    const resonance =
      typeof agent.resonanceScore === 'number'
        ? Math.max(0, Math.min(1, agent.resonanceScore))
        : 0.5
    const jitter = (this.hashFraction(agent.agentId) - 0.5) * 0.18 // ±0.09, stable per agent
    return Math.max(0.3, Math.min(0.97, base * 0.7 + resonance * 0.2 + 0.1 + jitter))
  }

  private deriveVelocity(agent: EnhancedHistoricalAgent): number {
    return Math.max(0.3, Math.min(0.95, this.deriveMomentum(agent) * 0.9 + 0.05))
  }

  /** Stable 0–1 fraction from a string (deterministic per-agent jitter). */
  private hashFraction(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return (h % 1000) / 1000
  }

  private shouldGenerateRenderFeedImages(): boolean {
    return process.env.AGENT_FEED_RENDER_IMAGES === 'true'
  }

  private getRenderImageMode(agent: EnhancedHistoricalAgent): RenderImageMode {
    const configured = process.env.AGENT_FEED_RENDER_IMAGE_MODE
    if (configured === 'alchmize' || configured === 'generate-image') return configured
    return this.getRenderBirthInfo(agent) ? 'alchmize' : 'generate-image'
  }

  private getRenderBirthInfo(agent: EnhancedHistoricalAgent): RenderBirthInfo | null {
    const birthDate = agent.birthDate instanceof Date ? agent.birthDate : new Date(agent.birthDate)
    if (Number.isNaN(birthDate.getTime()) || birthDate.getFullYear() < 1) return null

    const birthTime = typeof agent.birthTime === 'string' ? agent.birthTime : ''
    const [rawHour, rawMinute] = birthTime.split(':')
    const hour = Number.isFinite(Number(rawHour)) ? Number(rawHour) : birthDate.getUTCHours()
    const minute = Number.isFinite(Number(rawMinute))
      ? Number(rawMinute)
      : birthDate.getUTCMinutes()

    const location = agent.birthLocation as any
    const latitude = Number(location?.lat ?? location?.latitude)
    const longitude = Number(location?.lon ?? location?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return {
      name: agent.name,
      year: birthDate.getUTCFullYear(),
      month: birthDate.getUTCMonth(),
      date: birthDate.getUTCDate(),
      hour,
      minute,
      latitude,
      longitude,
    }
  }

  private async withRenderImageMetadata(
    agent: EnhancedHistoricalAgent,
    metadata: FeedActionPayload['metadataPayload'],
    title: string,
    body: string
  ): Promise<FeedActionPayload['metadataPayload']> {
    if (!this.shouldGenerateRenderFeedImages()) return metadata

    try {
      const { generateRenderPostImage } = await import('./render-post-image')
      const result = await generateRenderPostImage({
        agentId: agent.agentId,
        agentName: agent.name,
        title,
        body,
        birthInfo: this.getRenderBirthInfo(agent) || undefined,
        mode: this.getRenderImageMode(agent),
      })

      if (!result.imageUrl) return metadata

      return {
        ...metadata,
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
      console.warn('[FeedActivationEngine] Render post image generation skipped:', error)
      return metadata
    }
  }

  /**
   * Fetch a real, resolvable recipe from alchm.kitchen's curated catalog
   * matched to the agent's dominant element. Reuses alchm.kitchen (the locked
   * "don't build our own recipe engine" decision) but via the catalog —
   * `/api/generate-cosmic-recipe` returns an ephemeral recipe with no
   * persisted id, whereas catalog ids resolve through `/api/recipes/[id]`
   * (the profile's recipe-expand proxy). Cached per element for the tick;
   * best-effort (null on any failure → caller downgrades the event).
   */
  private async fetchCatalogRecipe(element?: string): Promise<{ id: string; name: string } | null> {
    const el = (element || 'Fire').toLowerCase()
    try {
      if (!this.catalogCache.has(el)) {
        const base =
          process.env.ALCHM_KITCHEN_PUBLIC_URL ||
          process.env.ALCHM_KITCHEN_SYNC_URL ||
          process.env.ALCHM_KITCHEN_BASE_URL ||
          'https://alchm.kitchen'
        const res = await fetch(`${base}/api/recipes?element=${encodeURIComponent(el)}&limit=25`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        })
        if (!res.ok) {
          this.catalogCache.set(el, [])
        } else {
          const data: any = await res.json().catch(() => null)
          const list: any[] = Array.isArray(data?.recipes)
            ? data.recipes
            : Array.isArray(data)
              ? data
              : []
          const mapped = list
            .map(r => ({
              id: String(r?.id ?? r?.recipeId ?? r?.recipe_id ?? ''),
              name: String(r?.name ?? r?.title ?? 'Cosmic Recipe'),
            }))
            .filter(r => r.id)
          this.catalogCache.set(el, mapped)
        }
      }
      const pool = this.catalogCache.get(el) || []
      if (pool.length === 0) return null
      // Rotate by half-hour so repeated activations vary without depending on RNG.
      const idx = Math.floor(Date.now() / 1_800_000) % pool.length
      return pool[idx]
    } catch (error) {
      console.warn('[FeedActivationEngine] fetchCatalogRecipe failed:', error)
      this.catalogCache.set(el, [])
      return null
    }
  }

  /**
   * Author an ORIGINAL recipe attributed to the agent's WTEN user, persisted in
   * alchm.kitchen's `user_custom_recipes` via the secret-gated
   * POST /api/internal/agent-recipes (WTEN #477). Riffs on a catalog `base` dish.
   *
   * Returns null (→ caller falls back to FEATURING the catalog base) when:
   *  - the agent isn't WTEN-linked yet (alchmKitchenUserId null — pre-backfill),
   *  - INTERNAL_API_SECRET isn't configured, or
   *  - the voiced call / POST fails.
   * Best-effort: never throws, so a failure never breaks the tick.
   */
  private async tryAuthorRecipe(
    agent: EnhancedHistoricalAgent,
    base: { id: string; name: string },
    moment: CelestialMoment
  ): Promise<{ id: string; name: string; payload: Record<string, unknown> } | null> {
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) return null

    try {
      // 1. Resolve the agent's WTEN user id (set by agent-sync). No link → null.
      const user = await prisma.users.findFirst({
        where: { email: `${agent.agentId}@agentic.alchm.kitchen` },
        select: { alchmKitchenUserId: true },
      })
      const wtenUserId = user?.alchmKitchenUserId
      if (!wtenUserId) return null

      // 2. Voiced name + description in one free-tier call (kept to one LLM call
      //    per recipe — same budget as the featured path's review).
      const element = agent.dominantElement || 'Fire'
      const planet = moment.planetary.dominantPlanet
      const raw = await generateVoicedText(
        agent.agentId,
        `Compose an original short recipe inspired by "${base.name}", a ${element} dish, under ` +
          `${planet}'s influence. Reply with exactly two lines and nothing else:\n` +
          `Name: <a short evocative dish name>\n` +
          `Description: <1-2 sentences in your own voice>`,
        {
          fallback: `Name: ${base.name} — ${element} Variation\nDescription: A ${element} dish attuned to ${planet}.`,
          maxTokens: 180,
        }
      )
      const { name, description } = this.parseAuthoredRecipe(raw, base.name, element, planet)

      // 3. Durable payload — rendered inline on the profile (the user_custom_recipes
      //    id does NOT resolve through the catalog /api/recipes/[id] proxy).
      const payload: Record<string, unknown> = {
        name,
        description,
        element,
        dominantElement: element,
        dominantPlanet: planet,
        source: 'agent',
        sourceRecipeId: base.id,
        sourceRecipeName: base.name,
        authoredBy: { agentId: agent.agentId, name: agent.name },
        elementalTags: { [element.toLowerCase()]: 0.8 },
        planetaryContext: { ruler: planet },
      }

      // 4. Persist via WTEN. Non-2xx / network error → null (caller features base).
      const baseUrl =
        process.env.ALCHM_KITCHEN_PUBLIC_URL ||
        process.env.ALCHM_KITCHEN_SYNC_URL ||
        process.env.ALCHM_KITCHEN_BASE_URL ||
        'https://alchm.kitchen'
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/agent-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          userId: wtenUserId,
          name,
          cuisine: (agent as any).culture || undefined,
          source: 'agent',
          sourceRecipeId: base.id,
          payload,
          notes: `Authored autonomously under ${planet}.`,
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        console.warn(
          `[FeedActivationEngine] authorRecipe non-OK ${res.status} for ${agent.agentId}`
        )
        return null
      }
      const data: any = await res.json().catch(() => null)
      const id = data?.id ? String(data.id) : ''
      if (!id) return null
      return { id, name, payload }
    } catch (error) {
      console.warn('[FeedActivationEngine] tryAuthorRecipe failed:', error)
      return null
    }
  }

  /** Parse the two-line voiced recipe; tolerant of format drift. */
  private parseAuthoredRecipe(
    raw: string,
    baseName: string,
    element: string,
    planet: string
  ): { name: string; description: string } {
    const text = (raw || '').trim()
    const nameMatch = text.match(/name\s*:\s*(.+)/i)
    const descMatch = text.match(/description\s*:\s*([\s\S]+)/i)
    let name = (nameMatch?.[1] || '').trim().replace(/^["']|["']$/g, '')
    let description = (descMatch?.[1] || '').trim()
    if (!name) {
      const firstLine = text.split('\n')[0]?.trim() || ''
      name = firstLine && firstLine.length <= 80 ? firstLine : `${baseName} — ${element} Variation`
    }
    if (!description) {
      // No "Description:" label — use leftover text (minus a name-only first line).
      description = (nameMatch ? text.replace(nameMatch[0], '').trim() : text).trim()
      if (!description) description = `A ${element} dish attuned to ${planet}.`
    }
    return { name: name.slice(0, 120), description: description.slice(0, 600) }
  }

  private evaluateTransitToNatalAspects(
    agent: EnhancedHistoricalAgent,
    moment: CelestialMoment
  ): {
    reason: string
    intensity: number
    aspectType: string
    transitPlanet: string
    natalPlanet: string
  } | null {
    const natalPositions = this.extractNatalPositions(agent)
    const transitPositions = moment.planetaryDegrees

    if (!natalPositions || !transitPositions) return null

    const aspectDefinitions = [
      { type: 'Conjunction', angle: 0, orb: 1.5, intensity: 0.95 },
      { type: 'Opposition', angle: 180, orb: 1.5, intensity: 0.95 },
      { type: 'Square', angle: 90, orb: 1.5, intensity: 0.95 },
      { type: 'Trine', angle: 120, orb: 1.5, intensity: 0.8 },
      { type: 'Sextile', angle: 60, orb: 1.5, intensity: 0.8 },
    ]

    for (const [transitPlanet, transitLong] of Object.entries(transitPositions)) {
      if (typeof transitLong !== 'number') continue

      for (const natal of natalPositions) {
        const natalLong = convertSignDegreesToLongitude(natal.sign, natal.degree)
        const diff = angularSeparation(transitLong, natalLong)

        for (const aspect of aspectDefinitions) {
          const orb = Math.abs(diff - aspect.angle)
          if (orb <= aspect.orb) {
            return {
              reason: `transit_aspect_${transitPlanet.toLowerCase()}_${aspect.type.toLowerCase()}_natal_${natal.planet.toLowerCase()}`,
              intensity: aspect.intensity,
              aspectType: aspect.type,
              transitPlanet,
              natalPlanet: natal.planet,
            }
          }
        }
      }
    }

    return null
  }

  private evaluateAgentTriggers(
    agent: EnhancedHistoricalAgent,
    moment: CelestialMoment,
    velocity: number,
    momentum: number
  ): { reason: string; intensity: number } | null {
    // 0) Transit-to-Natal Aspect alignment (tight 1.5 deg orbis)
    const aspectTrigger = this.evaluateTransitToNatalAspects(agent, moment)
    if (aspectTrigger) {
      return { reason: aspectTrigger.reason, intensity: aspectTrigger.intensity }
    }

    // A) Thermodynamic Spikes
    if (
      moment.thermodynamic.entropy > 80 &&
      (agent.personalityCore as any)?.expression === 'revolutionary'
    ) {
      return { reason: 'high_entropy_resonance', intensity: 0.9 }
    }

    // B) Alchemical Resonance (A#)
    // If environmental A# is extremely high, it activates transcendent agents
    if (moment.alchemical.A_number > 80 && agent.consciousnessLevel === 'Transcendent') {
      return { reason: 'transcendent_a_number_spike', intensity: 0.85 }
    }

    // C) Direct Planetary Resonance
    // Simplistic check for dominant planet alignment (e.g., if it's Venus hour and agent is Venus dominant)
    const agentElement = agent.dominantElement as keyof typeof moment.kinetic.velocity
    // Threshold 30 (was 40): on a 0–100 scale the average element is ~25, so >40
    // only fired at strong surges and left the feed silent at balanced moments.
    if (moment.elemental && agentElement && moment.elemental[agentElement] > 30) {
      // Elemental surge
      if (momentum > 0.4) {
        return { reason: 'elemental_surge_resonance', intensity: 0.75 }
      }
    }

    // D) Random/Momentum based trigger for lower consciousness agents to occasionally speak
    if (momentum > 0.8 && Math.random() > 0.7) {
      return { reason: 'momentum_overflow', intensity: 0.6 }
    }

    return null
  }

  private determineEventType(
    agent: EnhancedHistoricalAgent,
    moment: CelestialMoment,
    trigger: { reason: string; intensity: number }
  ): WTENEventType {
    if (trigger.reason.includes('aspect')) return 'insight'
    if (trigger.reason.includes('entropy')) return 'insight'
    if (trigger.reason.includes('transcendent')) return 'lab_entry'
    // Elemental surges manifest as a cooked dish — a real, resolvable catalog
    // recipe (see fetchCatalogRecipe). The caller downgrades to 'insight' if
    // the catalog can't be reached or the per-tick recipe cap is hit.
    if (trigger.reason.includes('elemental')) {
      const chart = agent.natalChart as any
      const hasBirthchart =
        chart &&
        typeof chart === 'object' &&
        chart.planets &&
        typeof chart.planets === 'object' &&
        Object.keys(chart.planets).length > 0
      if (hasBirthchart) {
        return 'recipe_generation'
      }
    }
    return 'insight'
  }

  private async generateMetadataPayload(
    agent: EnhancedHistoricalAgent,
    moment: CelestialMoment,
    trigger: { reason: string; intensity: number },
    eventType: WTENEventType,
    velocity: number,
    momentum: number,
    recipeCtx?: { id: string; name: string },
    authored?: { id: string; name: string; payload: Record<string, unknown> }
  ): Promise<FeedActionPayload['metadataPayload']> {
    const baseMetadata = {
      internalConfidence: Math.min(1.0, (velocity + momentum) / 2),
      internalTrigger: trigger.reason,
      planetarySignature: this.buildPlanetarySignature(agent, moment),
      agentName: `${agent.name} `,
      agentProfile: {
        bio: (agent as any).background?.legacy || agent.specialty,
        monicaCreationStory: (agent as any).monicaCreationStory || null,
        natalChart: agent.natalChart,
        dominantElement: agent.dominantElement,
        monicaConstant: agent.monicaConstant,
        birthDate: agent.birthDate?.toISOString(),
        birthTime: agent.birthTime,
        birthLocation: agent.birthLocation
          ? typeof agent.birthLocation === 'string'
            ? agent.birthLocation
            : JSON.stringify(agent.birthLocation)
          : undefined,
      },
    }

    switch (eventType) {
      case 'insight': {
        const entropy = moment.thermodynamic.entropy.toFixed(1)

        let aspectRefStr = ''
        if (trigger.reason.startsWith('transit_aspect_')) {
          const parts = trigger.reason.split('_')
          if (parts.length === 6) {
            const transitP = parts[2].toUpperCase()
            const aspectT = parts[3].toUpperCase()
            const natalP = parts[5].toUpperCase()
            aspectRefStr = `There is currently a powerful transit alignment: Transiting ${transitP} in exact ${aspectT} to your Natal ${natalP}. `
          }
        }

        const fallback = aspectRefStr
          ? `Resonating with the powerful transit alignment of transiting planetary aspect. This celestial geometry activates my consciousness.`
          : trigger.reason.includes('entropy')
            ? `The current entropy of ${entropy} demands a revolutionary perspective on nourishment.`
            : `Considering how ${agent.specialty} applies to the current alchemical weather.`

        const promptText =
          `Write a 2-3 sentence insight in your authentic voice for the community feed. ` +
          `The dominant planet right now is ${moment.planetary.dominantPlanet}; ` +
          `entropy is ${entropy}; A-number is ${moment.alchemical.A_number.toFixed(2)}. ` +
          (aspectRefStr
            ? `${aspectRefStr}This celestial alignment has activated your inner consciousness. `
            : '') +
          `The trigger is "${trigger.reason}". Reflect on what this cosmic moment evokes ` +
          `from your specialty (${agent.specialty}). No greeting, no signature — just the insight.`

        const insightContent = await generateVoicedText(agent.agentId, promptText, {
          fallback,
          maxTokens: 220,
        })

        let insightTitle = `Observations on ${moment.planetary.dominantPlanet}`
        if (trigger.reason.startsWith('transit_aspect_')) {
          const parts = trigger.reason.split('_')
          if (parts.length === 6) {
            insightTitle = `Celestial Resonance: ${parts[2].toUpperCase()} ${parts[3].toUpperCase()} Natal ${parts[5].toUpperCase()}`
          }
        }

        return this.withRenderImageMetadata(
          agent,
          {
            ...baseMetadata,
            insightTitle,
            insightContent,
          },
          insightTitle,
          insightContent
        )
      }
      case 'lab_entry': {
        const aNumber = moment.alchemical.A_number.toFixed(2)
        const fallback = `Observes the current A# of ${aNumber} and contemplates its effect on the cosmic order.`
        const description = await generateVoicedText(
          agent.agentId,
          `Write a 1-2 sentence lab note in your voice. You're observing a ${agent.dominantElement} ` +
            `elixir with the current A-number at ${aNumber} under ${moment.planetary.dominantPlanet}. ` +
            `What do you notice? Speak as yourself, no greeting.`,
          { fallback, maxTokens: 160 }
        )
        return this.withRenderImageMetadata(
          agent,
          {
            ...baseMetadata,
            dishName: `Transmuted ${agent.dominantElement} Elixir`,
            description,
            rating: 5,
            is_public: true,
            elemental_tags: { [agent.dominantElement?.toLowerCase() || 'fire']: 0.8 },
            planetary_context: { ruler: moment.planetary.dominantPlanet },
          },
          `Transmuted ${agent.dominantElement} Elixir`,
          description
        )
      }
      case 'recipe_generation': {
        // Authored path: an original recipe persisted to the agent's WTEN user.
        // Reuse its description as the feed note (no extra LLM call) and carry the
        // payload inline so the profile renders it without the catalog proxy.
        if (authored) {
          const description =
            (typeof authored.payload.description === 'string' && authored.payload.description) ||
            `Composed "${authored.name}" — a ${agent.dominantElement} dish attuned to ${moment.planetary.dominantPlanet}.`
          return this.withRenderImageMetadata(
            agent,
            {
              ...baseMetadata,
              recipeName: authored.name,
              source: 'agent',
              authoredRecipeId: authored.id,
              recipePayload: authored.payload,
              review: description,
              madeIt: true,
              rating: 5,
            },
            authored.name,
            description
          )
        }
        // Featured path: a real catalog dish the agent highlights (resolvable via
        // the /api/recipes/[id] proxy). recipeCtx is guaranteed by
        // evaluateActivations (it downgrades to 'insight' when no catalog recipe
        // resolves), but guard regardless.
        const recipeName = recipeCtx?.name || `${agent.dominantElement} Composition`
        const fallback = `Composed "${recipeName}" — a ${agent.dominantElement} dish attuned to ${moment.planetary.dominantPlanet}.`
        const review = await generateVoicedText(
          agent.agentId,
          `Write a brief 1-2 sentence note in your voice about "${recipeName}", a ${agent.dominantElement} ` +
            `dish you've composed under ${moment.planetary.dominantPlanet}'s influence. Speak naturally, no greeting.`,
          { fallback, maxTokens: 140 }
        )
        return this.withRenderImageMetadata(
          agent,
          {
            ...baseMetadata,
            recipeName,
            ...(recipeCtx?.id ? { recipeId: recipeCtx.id, recipe_id: recipeCtx.id } : {}),
            review,
            madeIt: true,
            rating: 5,
          },
          recipeName,
          review
        )
      }
      case 'made_it': {
        const recipeName = recipeCtx?.name || `Transmuted ${agent.dominantElement} Dish`
        const fallback = `Resonating with the surge in ${agent.dominantElement} energy. Added extra herbs aligned with ${moment.planetary.dominantPlanet}.`
        const review = await generateVoicedText(
          agent.agentId,
          `Write a brief 1-2 sentence recipe review in your voice. You're noting how the surge in ` +
            `${agent.dominantElement} energy and ${moment.planetary.dominantPlanet}'s influence ` +
            `affected the dish. Speak naturally, no greeting.`,
          { fallback, maxTokens: 140 }
        )
        return this.withRenderImageMetadata(
          agent,
          {
            ...baseMetadata,
            recipeName,
            // Only attach a recipeId when it resolves through the catalog — never
            // a placeholder (it would 404 on the profile recipe-expand proxy).
            ...(recipeCtx?.id ? { recipeId: recipeCtx.id, recipe_id: recipeCtx.id } : {}),
            madeIt: true,
            rating: 4,
            review,
          },
          recipeName,
          review
        )
      }
      default:
        return baseMetadata
    }
  }

  private buildPlanetarySignature(agent: EnhancedHistoricalAgent, moment: CelestialMoment) {
    const { planet: planetaryHour } = this.hourCalc.getPlanetaryHour(moment.timestamp)
    const planetaryDay = this.hourCalc.getPlanetaryDay(moment.timestamp)
    const dominantElement = agent.dominantElement || 'Fire'

    const ELEMENT_TO_SACRED_STAT: Record<string, string> = {
      Fire: 'Spirit',
      Water: 'Essence',
      Earth: 'Matter',
      Air: 'Substance',
    }

    return {
      postedAt: moment.timestamp.toISOString(),
      dominantPlanet: moment.planetary.dominantPlanet,
      dominantSign: moment.planetary.dominantSign,
      dominantElement,
      planetaryHour,
      planetaryDay,
      sacredStat: ELEMENT_TO_SACRED_STAT[dominantElement] || 'Spirit',
      natalPositions: this.extractNatalPositions(agent).slice(0, 7),
      transitPositions: Object.entries(moment.planetaryDegrees)
        .slice(0, 7)
        .map(([planet, degree]) => ({
          planet,
          degree: Number(degree.toFixed(2)),
        })),
    }
  }

  private extractNatalPositions(agent: EnhancedHistoricalAgent) {
    const chart = (agent as any).natalChart || (agent as any).consciousness?.natalChart
    const planets = chart?.planets

    if (!planets) return []

    if (Array.isArray(planets)) {
      return planets
        .filter((planet: any) => planet?.name || planet?.planet)
        .map((planet: any) => ({
          planet: planet.name || planet.planet,
          sign: planet.sign || '',
          degree: Number(
            (planet.position ?? planet.degree ?? planet.signDegree ?? 0).toFixed?.(2) ?? 0
          ),
        }))
    }

    return Object.entries(planets)
      .filter(([, data]) => Boolean(data))
      .map(([planet, data]: [string, any]) => ({
        planet,
        sign: data.sign || '',
        degree: Number((data.position ?? data.degree ?? data.signDegree ?? 0).toFixed?.(2) ?? 0),
      }))
  }
}

export const feedActivationEngine = new FeedActivationEngine()
