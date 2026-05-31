/**
 * Pattern to Rune Converter
 *
 * Converts astrological patterns (Grand Trine, T-Square, Yod, etc.)
 * into runic sigil prompts and generates personalized sigils using the imaginize API.
 */

import { PatternConfiguration, PatternType } from '../astrological-pattern-recognition'
import { fetchImaginize } from '../astrologize'
import {
  NatalSigilRune,
  RuneGeometry,
  SigilStyle,
  SIGIL_STYLE_PARAMS,
  PATTERN_SIGIL_MAPPINGS,
  createNatalSigilRune,
  calculateSigilPower,
  calculateSigilCosts,
} from './natal-sigil-runes'

export class PatternToRuneConverter {
  /**
   * Convert a sacred pattern to an imaginize prompt
   */
  static convertPatternToPrompt(
    pattern: PatternConfiguration,
    style: SigilStyle,
    geometry: RuneGeometry
  ): string {
    const styleParams = SIGIL_STYLE_PARAMS[style]
    const patternMapping = PATTERN_SIGIL_MAPPINGS[pattern.type]
    const elementStr = pattern.element ? `${pattern.element} element` : 'cosmic essence'
    const modalityStr = pattern.modality ? `${pattern.modality} modality` : 'universal flow'

    // Base prompt with style modifier
    let prompt = `${styleParams.prompt_modifier}, `

    // Pattern-specific descriptions
    switch (pattern.type) {
      case 'grand-trine':
        prompt += `Three-fold sacred triangle of ${elementStr}, `
        prompt += `flowing harmonic energy between ${pattern.planets.join(', ')}, `
        prompt += `divine grace pattern with ${pattern.strength}% power, `
        prompt += `equilateral triangle of light beams in ${styleParams.colorScheme.join(', ')} colors`
        break

      case 't-square':
        prompt += `Dynamic tension cross with ${pattern.planets[2]} as focal apex, `
        prompt += `transformative ${modalityStr} energy pattern, `
        prompt += `cardinal cross with ${pattern.strength}% intensity, `
        prompt += `angular ${styleParams.lineStyle} strokes forming sacred geometry`
        break

      case 'grand-cross':
        prompt += `Perfect four-fold balance of cosmic tension, `
        prompt += `${pattern.planets.join(' opposing ')} in dynamic equilibrium, `
        prompt += `master pattern of ${pattern.strength}% power, `
        prompt += `interlocking squares with ${styleParams.texture} texture`
        break

      case 'yod': {
        const apex = pattern.planets[0] // Apex planet is typically first
        prompt += `Finger of God pattern pointing to ${apex}, `
        prompt += `destiny activation sigil with ${pattern.strength}% fate energy, `
        prompt += `two quincunx lines converging on apex with sextile base, `
        prompt += `mystical arrow of purpose in ${styleParams.lineStyle} style`
        break
      }

      case 'stellium':
        prompt += `Concentrated stellar cluster of ${pattern.planets.length} planetary energies, `
        prompt += `unified ${elementStr} manifestation vortex, `
        prompt += `${pattern.strength}% concentrated power node, `
        prompt += `spiral galaxy pattern with ${styleParams.texture} effect`
        break

      case 'mystic-rectangle':
        prompt += `Sacred rectangular harmony of balanced oppositions, `
        prompt += `practical mysticism pattern with ${pattern.strength}% stability, `
        prompt += `two oppositions linked by sextiles and trines, `
        prompt += `golden ratio proportions in ${styleParams.lineStyle} design`
        break

      case 'kite':
        prompt += `Soaring consciousness elevation pattern, `
        prompt += `grand trine with focused ${pattern.planets[3]} direction, `
        prompt += `${pattern.strength}% uplift power, `
        prompt += `diamond kite shape with energy tail in ${styleParams.colorScheme[0]} gradient`
        break

      case 'grand-sextile':
        prompt += `Perfect Star of David configuration, `
        prompt += `six-pointed star of absolute harmony, `
        prompt += `${pattern.strength}% cosmic perfection, `
        prompt += `interlocking triangles with ${styleParams.texture} finish`
        break

      case 'cradle':
        prompt += `Nurturing cradle pattern of supportive aspects, `
        prompt += `gentle rocking rhythm of ${elementStr}, `
        prompt += `${pattern.strength}% protective embrace, `
        prompt += `curved cradle shape in ${styleParams.lineStyle} strokes`
        break

      default:
        prompt += `Sacred geometric pattern of ${pattern.type}, `
        prompt += `${pattern.planets.length} planetary energies in ${elementStr}, `
        prompt += `${pattern.strength}% resonance power`
    }

    // Add geometry hints
    prompt += `, ${geometry.aspectLines.length} aspect lines forming the pattern`
    prompt += `, ${geometry.powerNodes.length} glowing power convergence points`

    // Add style-specific background elements
    if (styleParams.backgroundElements.length > 0) {
      prompt += `, background featuring ${styleParams.backgroundElements.join(', ')}`
    }

    // Technical specifications
    prompt += `, hyperdetailed sacred geometry, 8k quality, mystical glow`
    prompt += `, centered composition, perfect symmetry where applicable`

    return prompt
  }

  /**
   * Generate aspect line descriptions for the prompt
   */
  static describeAspectLines(geometry: RuneGeometry): string {
    const aspectGroups = geometry.aspectLines.reduce(
      (acc, line) => {
        acc[line.type] = (acc[line.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const descriptions = Object.entries(aspectGroups).map(([type, count]) => {
      switch (type) {
        case 'conjunction':
          return `${count} convergence points of unified energy`
        case 'opposition':
          return `${count} polarizing axis lines of dynamic tension`
        case 'trine':
          return `${count} flowing triangular harmony connections`
        case 'square':
          return `${count} challenging right-angle power lines`
        case 'sextile':
          return `${count} supportive opportunity bridges`
        default:
          return `${count} ${type} aspect connections`
      }
    })

    return descriptions.join(', ')
  }

  /**
   * Generate a complete sigil from a pattern
   */
  static async generateSigilFromPattern(
    pattern: PatternConfiguration,
    geometry: RuneGeometry,
    style: SigilStyle
  ): Promise<NatalSigilRune> {
    try {
      // Generate the prompt
      const prompt = this.convertPatternToPrompt(pattern, style, geometry)

      // Add aspect line descriptions
      const aspectDescription = this.describeAspectLines(geometry)
      const fullPrompt = `${prompt}, aspect geometry: ${aspectDescription}`

      console.log('Generating sigil with prompt:', fullPrompt)

      // Call imaginize API with improved error handling
      const imageData = await fetchImaginize(fullPrompt, {
        style_preset: `mystical-${style}`,
        width: 1024,
        height: 1024,
        cfg_scale: 12,
        steps: 50,
        seed: this.generateSeedFromPattern(pattern),
        geometryHints: {
          aspectCount: geometry.aspectLines.length,
          powerNodeCount: geometry.powerNodes.length,
          dominantPattern: pattern.type,
          patternStrength: pattern.strength,
          elementalSignature: geometry.dominantElement,
        },
      })

      // Handle fallback responses
      if (imageData.fallback) {
        console.warn('Image generation fallback:', imageData.error)
      }

      // Create the natal sigil rune
      const sigilRune = createNatalSigilRune(
        geometry,
        style,
        'pattern-based',
        imageData?.generated_image_url || imageData?.url || imageData?.imageUrl
      )

      // Enhance with pattern-specific data
      sigilRune.description = `${style.charAt(0).toUpperCase() + style.slice(1)} sigil embodying your ${pattern.type} pattern: ${pattern.interpretation}`

      // Add pattern-specific requirements
      if (pattern.type === 'grand-trine') {
        sigilRune.requirements.moonPhase = 'full'
      } else if (pattern.type === 'yod') {
        sigilRune.requirements.planetaryHour = 'mercury'
      } else if (pattern.type === 'grand-cross') {
        sigilRune.requirements.consciousness_level = 7
      }

      return sigilRune
    } catch (error) {
      console.error('Error generating sigil from pattern:', error)

      // Return a basic sigil without image on error
      const fallbackSigil = createNatalSigilRune(geometry, style, 'pattern-based')

      fallbackSigil.description = `${style} sigil for ${pattern.type} pattern (image generation pending)`
      return fallbackSigil
    }
  }

  /**
   * Generate multiple sigil variations for a pattern
   */
  static async generateSigilVariations(
    pattern: PatternConfiguration,
    geometry: RuneGeometry,
    styles: SigilStyle[] = ['nordic', 'celtic', 'alchemical', 'cosmic']
  ): Promise<NatalSigilRune[]> {
    const variations = await Promise.all(
      styles.map(style =>
        this.generateSigilFromPattern(pattern, geometry, style).catch(err => {
          console.error(`Failed to generate ${style} variation:`, err)
          return null
        })
      )
    )

    return variations.filter((sigil): sigil is NatalSigilRune => sigil !== null)
  }

  /**
   * Generate a deterministic seed from pattern for consistent variations
   */
  private static generateSeedFromPattern(pattern: PatternConfiguration): number {
    // Create a hash from pattern properties
    const hashString = `${pattern.type}-${pattern.planets.join('-')}-${pattern.strength}`
    let hash = 0
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Analyze which style best suits a pattern
   */
  static recommendStyle(pattern: PatternConfiguration): SigilStyle {
    // Recommendations based on pattern type and elements
    if (pattern.type === 'grand-trine') {
      // Harmonious patterns suit Celtic style
      return 'celtic'
    } else if (pattern.type === 't-square' || pattern.type === 'grand-cross') {
      // Tension patterns suit Nordic style
      return 'nordic'
    } else if (pattern.type === 'yod' || pattern.type === 'mystic-rectangle') {
      // Mystical patterns suit Alchemical style
      return 'alchemical'
    } else if (pattern.type === 'stellium' || pattern.type === 'grand-sextile') {
      // Cosmic patterns suit Cosmic style
      return 'cosmic'
    }

    // Default based on element
    switch (pattern.element?.toLowerCase()) {
      case 'fire':
        return 'nordic'
      case 'water':
        return 'celtic'
      case 'air':
        return 'cosmic'
      case 'earth':
        return 'alchemical'
      default:
        return 'cosmic'
    }
  }

  /**
   * Create a composite sigil from multiple patterns
   */
  static async generateCompositeSigil(
    patterns: PatternConfiguration[],
    geometry: RuneGeometry,
    style: SigilStyle
  ): Promise<NatalSigilRune> {
    // Sort patterns by strength
    const sortedPatterns = patterns.sort((a, b) => b.strength - a.strength)

    // Build composite prompt
    let compositePrompt = `${SIGIL_STYLE_PARAMS[style].prompt_modifier}, `
    compositePrompt += 'Multi-layered sacred sigil combining '
    compositePrompt += sortedPatterns.map(p => p.type).join(', ')

    // Add dominant pattern details
    const dominant = sortedPatterns[0]
    compositePrompt += `, dominant ${dominant.type} pattern with ${dominant.strength}% power`

    // Add secondary patterns
    if (sortedPatterns.length > 1) {
      compositePrompt += ', secondary patterns: '
      compositePrompt += sortedPatterns
        .slice(1)
        .map(p => `${p.type} (${p.strength}%)`)
        .join(', ')
    }

    // Add geometric complexity
    compositePrompt += `, complex sacred geometry with ${geometry.aspectLines.length} intersecting lines`
    compositePrompt += `, ${geometry.powerNodes.length} major energy convergence nodes`
    compositePrompt += `, layered translucent patterns, holographic depth`
    compositePrompt += `, masterwork quality, museum-grade sacred art`

    try {
      const imageData = await fetchImaginize(compositePrompt, {
        style_preset: `mystical-${style}-composite`,
        width: 2048,
        height: 2048,
        cfg_scale: 15,
        steps: 75,
        geometryHints: {
          patterns: patterns.map(p => ({
            type: p.type,
            strength: p.strength,
            planets: p.planets,
          })),
        },
      })

      const compositeSigil = createNatalSigilRune(
        geometry,
        style,
        'pattern-based',
        imageData?.generated_image_url || imageData?.url
      )

      compositeSigil.name = `Master ${style.charAt(0).toUpperCase() + style.slice(1)} Composite Sigil`
      compositeSigil.description = `Extraordinary sigil combining ${patterns.length} sacred patterns into unified consciousness tool`
      compositeSigil.rarity = 'cosmic'
      compositeSigil.powerLevel = 100

      return compositeSigil
    } catch (error) {
      console.error('Error generating composite sigil:', error)
      throw error
    }
  }

  /**
   * Generate prompt for aspect-focused sigil (no major pattern)
   */
  static generateAspectFocusedPrompt(geometry: RuneGeometry, style: SigilStyle): string {
    const styleParams = SIGIL_STYLE_PARAMS[style]
    const aspectLines = this.describeAspectLines(geometry)

    let prompt = `${styleParams.prompt_modifier}, `
    prompt += `Intricate web of ${geometry.aspectLines.length} celestial connections, `
    prompt += `${aspectLines}, `
    prompt += `${geometry.dominantElement} elemental dominance, `
    prompt += `${geometry.powerNodes.length} glowing intersection points, `

    // Elemental balance description
    const elements = geometry.elementalBalance
    prompt += `elemental harmony: ${elements.fire}% fire, ${elements.water}% water, `
    prompt += `${elements.air}% air, ${elements.earth}% earth energies, `

    // Visual style
    prompt += `${styleParams.lineStyle} line work, `
    prompt += `${styleParams.texture} texture finish, `
    prompt += `color palette: ${styleParams.colorScheme.join(', ')}, `
    prompt += `sacred geometry, perfect aspect ratio, mystical resonance`

    return prompt
  }
}
