/**
 * Enhanced Recommendation Service
 * Integrates rune influence, agent resonance, and token alignment
 * into cuisine, ingredient, and recipe recommendations
 */

import { KalchmFoodAnalyzer, FOOD_PROFILES } from '@/lib/food-recommendation-rules'
import { TokensClient, TokenCalculationResult } from '@/lib/clients/tokens-client'
import {
  RuneAgentClient,
  RuneOfTheMoment,
  AgentRecommendation,
} from '@/lib/clients/rune-agent-client'

// Types
export interface RecommendationRequest {
  datetime: Date
  location: { latitude: number; longitude: number }
  preferences?: {
    cuisineTypes?: string[]
    dietaryRestrictions?: string[]
    intensity?: 'gentle' | 'moderate' | 'intense'
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    cookingTime?: 'quick' | 'moderate' | 'slow'
  }
}

export interface CuisineRecommendation {
  name: string
  score: number
  reasoning: string[]
  runeInfluence: string
  agentGuidance: string
  tokenAlignment: string
  characteristics: string[]
  suggestedDishes: string[]
  cookingMethods: string[]
  seasonalRelevance: number
}

export interface IngredientRecommendation {
  name: string
  category:
    | 'protein'
    | 'vegetable'
    | 'grain'
    | 'spice'
    | 'herb'
    | 'fat'
    | 'dairy'
    | 'fruit'
    | 'other'
  score: number
  reasoning: string[]
  runeResonance: number
  agentEndorsement: number
  tokenSynergy: number
  nutritionalBenefits: string[]
  preparationSuggestions: string[]
  avoidanceReasons?: string[]
}

export interface RecipeRecommendation {
  name: string
  cuisineType: string
  difficulty: 'easy' | 'moderate' | 'advanced'
  cookingTime: number // in minutes
  score: number
  reasoning: string[]
  runeGuidance: string
  agentTips: string[]
  ingredients: string[]
  cookingMethod: string
  energeticProperties: {
    element: string
    temperature: 'cooling' | 'neutral' | 'warming'
    mood: string
  }
}

export interface EnhancedRecommendationResult {
  cuisines: CuisineRecommendation[]
  ingredients: IngredientRecommendation[]
  recipes: RecipeRecommendation[]
  context: {
    rune: RuneOfTheMoment
    agent: AgentRecommendation
    tokens: TokenCalculationResult
    influence: {
      runeWeight: number
      agentWeight: number
      tokenWeight: number
    }
  }
  metadata: {
    generationTime: number
    totalRecommendations: number
    confidenceScore: number
  }
}

export class EnhancedRecommendationService {
  /**
   * Generate comprehensive recommendations with rune/agent influence
   */
  static async generateRecommendations(
    request: RecommendationRequest
  ): Promise<EnhancedRecommendationResult> {
    const startTime = Date.now()

    try {
      // Generate parallel backend requests for context
      const [tokenResult, runeAgentResult] = await Promise.all([
        TokensClient.calculateRates({
          datetime: request.datetime,
          location: request.location,
        }),
        RuneAgentClient.generateComplete({
          datetime: request.datetime,
          location: request.location,
          context: 'cuisine',
          preferences: request.preferences,
        }),
      ])

      // Calculate influence weights based on data quality
      const influence = this.calculateInfluenceWeights(tokenResult, runeAgentResult)

      // Generate recommendations with integrated influence
      const [cuisines, ingredients, recipes] = await Promise.all([
        this.generateCuisineRecommendations(request, tokenResult, runeAgentResult, influence),
        this.generateIngredientRecommendations(request, tokenResult, runeAgentResult, influence),
        this.generateRecipeRecommendations(request, tokenResult, runeAgentResult, influence),
      ])

      // Calculate overall confidence
      const confidenceScore = this.calculateOverallConfidence(
        tokenResult,
        runeAgentResult,
        influence
      )

      return {
        cuisines,
        ingredients,
        recipes,
        context: {
          rune: runeAgentResult.rune,
          agent: runeAgentResult.agent,
          tokens: tokenResult,
          influence,
        },
        metadata: {
          generationTime: Date.now() - startTime,
          totalRecommendations: cuisines.length + ingredients.length + recipes.length,
          confidenceScore,
        },
      }
    } catch (error) {
      console.error('Enhanced recommendation generation failed:', error)

      // Fallback to basic recommendations
      return this.generateFallbackRecommendations(request, startTime)
    }
  }

  /**
   * Generate cuisine recommendations with integrated influence
   */
  private static async generateCuisineRecommendations(
    request: RecommendationRequest,
    tokens: TokenCalculationResult,
    runeAgent: any,
    influence: any
  ): Promise<CuisineRecommendation[]> {
    const cuisineTypes = [
      'Italian',
      'Japanese',
      'Mediterranean',
      'Indian',
      'Thai',
      'Mexican',
      'French',
      'Chinese',
      'Middle Eastern',
      'Vietnamese',
      'Korean',
      'Greek',
    ]

    const recommendations: CuisineRecommendation[] = []

    for (const cuisine of cuisineTypes) {
      // Base scoring using existing logic
      let score = this.calculateBaseCuisineScore(cuisine, request.preferences)

      // Apply rune influence
      const runeInfluence = this.calculateRuneInfluence(cuisine, runeAgent.rune)
      score += runeInfluence * influence.runeWeight

      // Apply agent resonance
      const agentResonance = this.calculateAgentResonance(cuisine, runeAgent.agent)
      score += agentResonance * influence.agentWeight

      // Apply token alignment
      const tokenAlignment = this.calculateTokenAlignment(cuisine, tokens)
      score += tokenAlignment * influence.tokenWeight

      // Seasonal relevance
      const seasonalRelevance = this.calculateSeasonalRelevance(cuisine, request.datetime)

      // Final score normalization
      const finalScore = Math.max(0, Math.min(1, score)) * seasonalRelevance

      if (finalScore > 0.3) {
        // Only include decent recommendations
        recommendations.push({
          name: cuisine,
          score: finalScore,
          reasoning: this.generateCuisineReasoning(
            cuisine,
            runeInfluence,
            agentResonance,
            tokenAlignment
          ),
          runeInfluence: this.getRuneInfluenceDescription(cuisine, runeAgent.rune),
          agentGuidance: this.getAgentGuidanceDescription(cuisine, runeAgent.agent),
          tokenAlignment: this.getTokenAlignmentDescription(cuisine, tokens),
          characteristics: this.getCuisineCharacteristics(cuisine),
          suggestedDishes: this.getSuggestedDishes(cuisine, runeAgent.rune.element),
          cookingMethods: this.getCuisineCookingMethods(cuisine),
          seasonalRelevance,
        })
      }
    }

    // Sort by score and return top 6
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 6)
  }

  /**
   * Generate ingredient recommendations with integrated influence
   */
  private static async generateIngredientRecommendations(
    request: RecommendationRequest,
    tokens: TokenCalculationResult,
    runeAgent: any,
    influence: any
  ): Promise<IngredientRecommendation[]> {
    // Base ingredient categories
    const ingredientDatabase = this.getIngredientDatabase()
    const recommendations: IngredientRecommendation[] = []

    for (const ingredient of ingredientDatabase) {
      // Base scoring
      let score = this.calculateBaseIngredientScore(ingredient, request.preferences)

      // Rune resonance (element alignment)
      const runeResonance = this.calculateIngredientRuneResonance(ingredient, runeAgent.rune)
      score += runeResonance * influence.runeWeight

      // Agent endorsement
      const agentEndorsement = this.calculateIngredientAgentEndorsement(ingredient, runeAgent.agent)
      score += agentEndorsement * influence.agentWeight

      // Token synergy
      const tokenSynergy = this.calculateIngredientTokenSynergy(ingredient, tokens)
      score += tokenSynergy * influence.tokenWeight

      // Apply dietary restrictions
      if (this.violatesDietaryRestrictions(ingredient, request.preferences?.dietaryRestrictions)) {
        continue // Skip this ingredient
      }

      const finalScore = Math.max(0, Math.min(1, score))

      if (finalScore > 0.4) {
        // Higher threshold for ingredients
        recommendations.push({
          name: ingredient.name,
          category: ingredient.category as any,
          score: finalScore,
          reasoning: this.generateIngredientReasoning(
            ingredient,
            runeResonance,
            agentEndorsement,
            tokenSynergy
          ),
          runeResonance,
          agentEndorsement,
          tokenSynergy,
          nutritionalBenefits: ingredient.nutritionalBenefits,
          preparationSuggestions: ingredient.preparationSuggestions,
        })
      }
    }

    // Sort by score and return top 12
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 12)
  }

  /**
   * Generate recipe recommendations with integrated influence
   */
  private static async generateRecipeRecommendations(
    request: RecommendationRequest,
    tokens: TokenCalculationResult,
    runeAgent: any,
    influence: any
  ): Promise<RecipeRecommendation[]> {
    const recipeDatabase = this.getRecipeDatabase()
    const recommendations: RecipeRecommendation[] = []

    for (const recipe of recipeDatabase) {
      // Base scoring
      let score = this.calculateBaseRecipeScore(recipe, request.preferences)

      // Rune guidance integration
      const runeAlignment = this.calculateRecipeRuneAlignment(recipe, runeAgent.rune)
      score += runeAlignment * influence.runeWeight

      // Agent tips integration
      const agentCompatibility = this.calculateRecipeAgentCompatibility(recipe, runeAgent.agent)
      score += agentCompatibility * influence.agentWeight

      // Token harmony
      const tokenHarmony = this.calculateRecipeTokenHarmony(recipe, tokens)
      score += tokenHarmony * influence.tokenWeight

      const finalScore = Math.max(0, Math.min(1, score))

      if (finalScore > 0.5) {
        // High threshold for recipes
        recommendations.push({
          name: recipe.name,
          cuisineType: recipe.cuisineType,
          difficulty: recipe.difficulty,
          cookingTime: recipe.cookingTime,
          score: finalScore,
          reasoning: this.generateRecipeReasoning(
            recipe,
            runeAlignment,
            agentCompatibility,
            tokenHarmony
          ),
          runeGuidance: this.getRecipeRuneGuidance(recipe, runeAgent.rune),
          agentTips: this.getRecipeAgentTips(recipe, runeAgent.agent),
          ingredients: recipe.ingredients,
          cookingMethod: recipe.cookingMethod,
          energeticProperties: this.calculateRecipeEnergeticProperties(recipe, runeAgent.rune),
        })
      }
    }

    // Sort by score and return top 8
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 8)
  }

  // Helper methods for scoring and influence calculation

  private static calculateInfluenceWeights(tokens: TokenCalculationResult, runeAgent: any) {
    // Weight based on data source quality
    const tokenReliability = tokens.metadata.source === 'backend' ? 1.0 : 0.7
    const runeAgentReliability = runeAgent.metadata.source === 'backend' ? 1.0 : 0.7

    return {
      runeWeight: 0.3 * runeAgentReliability,
      agentWeight: 0.25 * runeAgentReliability,
      tokenWeight: 0.2 * tokenReliability,
    }
  }

  private static calculateBaseCuisineScore(cuisine: string, preferences: any): number {
    let score = 0.5 // Base score

    // Check user preferences
    if (preferences?.cuisineTypes?.includes(cuisine)) {
      score += 0.3
    }

    // Add some variety based on cuisine characteristics
    const cuisineScores = {
      Mediterranean: 0.8,
      Japanese: 0.7,
      Italian: 0.75,
      Indian: 0.6,
      Thai: 0.65,
      Vietnamese: 0.7,
      Greek: 0.8,
      Mexican: 0.6,
    }

    return score + (cuisineScores[cuisine as keyof typeof cuisineScores] || 0.5) * 0.2
  }

  private static calculateRuneInfluence(cuisine: string, rune: RuneOfTheMoment): number {
    // Map cuisines to elements
    const cuisineElements = {
      Italian: 'fire',
      Mediterranean: 'earth',
      Japanese: 'water',
      Thai: 'fire',
      Indian: 'fire',
      Vietnamese: 'water',
      French: 'air',
      Chinese: 'earth',
      Korean: 'fire',
      Greek: 'earth',
      Mexican: 'fire',
      'Middle Eastern': 'earth',
    }

    const cuisineElement = cuisineElements[cuisine as keyof typeof cuisineElements]

    // Same element gets boost, all elements are compatible
    return cuisineElement === rune.element ? 0.3 : 0.1
  }

  private static calculateAgentResonance(cuisine: string, agent: AgentRecommendation): number {
    // Check if agent has culinary specialties matching cuisine
    const resonance = agent.culinarySpecialty.some(specialty =>
      specialty.toLowerCase().includes(cuisine.toLowerCase())
    )
      ? 0.2
      : 0.05

    // Add consciousness-based wisdom bonus
    return resonance + (agent.overallScore / 100) * 0.1
  }

  private static calculateTokenAlignment(cuisine: string, tokens: TokenCalculationResult): number {
    // Map cuisines to token preferences
    const cuisineTokenMapping = {
      Italian: 'Spirit',
      Japanese: 'Essence',
      Mediterranean: 'Matter',
      Indian: 'Spirit',
      Thai: 'Spirit',
      Vietnamese: 'Essence',
      French: 'Substance',
      Chinese: 'Matter',
      Korean: 'Spirit',
      Greek: 'Matter',
      Mexican: 'Spirit',
      'Middle Eastern': 'Matter',
    }

    const primaryToken =
      cuisineTokenMapping[cuisine as keyof typeof cuisineTokenMapping] || 'Spirit'
    const tokenValue = tokens.rates[primaryToken as keyof typeof tokens.rates] || 1.0

    // Normalize token influence
    return Math.min(0.2, tokenValue / 5)
  }

  private static calculateSeasonalRelevance(cuisine: string, datetime: Date): number {
    const month = datetime.getMonth()

    // Seasonal cuisine preferences
    const seasonalMapping = {
      Mediterranean: [4, 5, 6, 7, 8], // Spring/Summer
      Italian: [0, 1, 2, 9, 10, 11], // Fall/Winter
      Thai: [3, 4, 5, 6, 7, 8], // Warm months
      Japanese: [0, 1, 2, 3, 9, 10, 11], // All seasons
      Indian: [9, 10, 11, 0, 1, 2], // Cooler months
    }

    const cuisineSeasons = seasonalMapping[cuisine as keyof typeof seasonalMapping]
    return cuisineSeasons?.includes(month) ? 1.1 : 0.9
  }

  // Additional helper methods for ingredient and recipe scoring...

  private static calculateBaseIngredientScore(ingredient: any, preferences: any): number {
    let score = 0.5

    // Check dietary preferences
    if (
      preferences?.dietaryRestrictions?.includes('vegetarian') &&
      ingredient.category === 'protein' &&
      ingredient.animalBased
    ) {
      return 0 // Exclude
    }

    // Seasonal bonus
    const season = this.getCurrentSeason(new Date())
    if (ingredient.seasons?.includes(season)) {
      score += 0.2
    }

    return score
  }

  private static calculateIngredientRuneResonance(ingredient: any, rune: RuneOfTheMoment): number {
    // Element-based ingredient resonance
    const elementMapping = {
      fire: ['spices', 'peppers', 'garlic', 'ginger'],
      water: ['cucumber', 'melon', 'seafood', 'dairy'],
      earth: ['root vegetables', 'grains', 'legumes', 'nuts'],
      air: ['leafy greens', 'herbs', 'light fruits'],
    }

    const resonantIngredients = elementMapping[rune.element as keyof typeof elementMapping] || []
    return resonantIngredients.some(
      (type: string) =>
        ingredient.name.toLowerCase().includes(type) ||
        ingredient.category.toLowerCase().includes(type)
    )
      ? 0.3
      : 0.1
  }

  private static getIngredientDatabase() {
    // Simplified ingredient database
    return [
      {
        name: 'Tomatoes',
        category: 'vegetable',
        nutritionalBenefits: ['Lycopene', 'Vitamin C'],
        preparationSuggestions: ['Raw', 'Roasted', 'Sauce'],
        seasons: ['summer'],
      },
      {
        name: 'Basil',
        category: 'herb',
        nutritionalBenefits: ['Anti-inflammatory', 'Antioxidants'],
        preparationSuggestions: ['Fresh', 'Pesto', 'Dried'],
        seasons: ['summer'],
      },
      {
        name: 'Quinoa',
        category: 'grain',
        nutritionalBenefits: ['Complete protein', 'Fiber'],
        preparationSuggestions: ['Boiled', 'Salad', 'Soup'],
        seasons: ['all'],
      },
      {
        name: 'Salmon',
        category: 'protein',
        nutritionalBenefits: ['Omega-3', 'Protein'],
        preparationSuggestions: ['Grilled', 'Baked', 'Poached'],
        seasons: ['all'],
        animalBased: true,
      },
      {
        name: 'Avocado',
        category: 'fat',
        nutritionalBenefits: ['Healthy fats', 'Fiber'],
        preparationSuggestions: ['Raw', 'Smoothie', 'Toast'],
        seasons: ['all'],
      },
      {
        name: 'Sweet Potato',
        category: 'vegetable',
        nutritionalBenefits: ['Beta-carotene', 'Fiber'],
        preparationSuggestions: ['Roasted', 'Mashed', 'Fries'],
        seasons: ['fall', 'winter'],
      },
      {
        name: 'Spinach',
        category: 'vegetable',
        nutritionalBenefits: ['Iron', 'Folate'],
        preparationSuggestions: ['Sautéed', 'Salad', 'Smoothie'],
        seasons: ['spring', 'fall'],
      },
      {
        name: 'Turmeric',
        category: 'spice',
        nutritionalBenefits: ['Anti-inflammatory', 'Antioxidants'],
        preparationSuggestions: ['Ground', 'Tea', 'Curry'],
        seasons: ['all'],
      },
    ]
  }

  private static getRecipeDatabase() {
    // Simplified recipe database
    return [
      {
        name: 'Mediterranean Quinoa Bowl',
        cuisineType: 'Mediterranean',
        difficulty: 'easy' as const,
        cookingTime: 25,
        ingredients: ['quinoa', 'tomatoes', 'cucumber', 'olives', 'feta'],
        cookingMethod: 'Assembly',
      },
      {
        name: 'Miso Glazed Salmon',
        cuisineType: 'Japanese',
        difficulty: 'moderate' as const,
        cookingTime: 35,
        ingredients: ['salmon', 'miso', 'mirin', 'sake', 'scallions'],
        cookingMethod: 'Baking',
      },
      {
        name: 'Thai Basil Stir-fry',
        cuisineType: 'Thai',
        difficulty: 'easy' as const,
        cookingTime: 15,
        ingredients: ['basil', 'garlic', 'chilies', 'vegetables', 'soy sauce'],
        cookingMethod: 'Stir-frying',
      },
    ]
  }

  // More helper methods...

  private static calculateIngredientAgentEndorsement(
    ingredient: any,
    agent: AgentRecommendation
  ): number {
    // Agent consciousness level influences endorsement
    return agent.overallScore / 500 // Small influence
  }

  private static calculateIngredientTokenSynergy(
    ingredient: any,
    tokens: TokenCalculationResult
  ): number {
    // Simple token synergy calculation
    const avgToken =
      Object.values(tokens.rates).reduce((sum, rate) => sum + rate, 0) /
      Object.keys(tokens.rates).length
    return Math.min(0.1, avgToken / 10)
  }

  private static violatesDietaryRestrictions(ingredient: any, restrictions?: string[]): boolean {
    if (!restrictions) return false

    if (restrictions.includes('vegetarian') && ingredient.animalBased) return true
    if (
      restrictions.includes('vegan') &&
      (ingredient.animalBased || ingredient.category === 'dairy')
    )
      return true

    return false
  }

  private static getCurrentSeason(date: Date): string {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  // Reasoning and description generators

  private static generateCuisineReasoning(
    cuisine: string,
    runeInfluence: number,
    agentResonance: number,
    tokenAlignment: number
  ): string[] {
    const reasons = []
    if (runeInfluence > 0.2) reasons.push('Strong rune element alignment')
    if (agentResonance > 0.15) reasons.push('Agent consciousness endorsement')
    if (tokenAlignment > 0.1) reasons.push('Favorable token conditions')
    return reasons.length > 0 ? reasons : ['Good overall compatibility']
  }

  private static generateIngredientReasoning(
    ingredient: any,
    runeResonance: number,
    agentEndorsement: number,
    tokenSynergy: number
  ): string[] {
    const reasons = []
    if (runeResonance > 0.2) reasons.push('Elemental resonance with current rune')
    if (agentEndorsement > 0.05) reasons.push('Agent consciousness support')
    if (tokenSynergy > 0.05) reasons.push('Token energy alignment')
    if (ingredient.seasons?.includes(this.getCurrentSeason(new Date())))
      reasons.push('Seasonal availability')
    return reasons.length > 0 ? reasons : ['Nutritional benefits']
  }

  private static generateRecipeReasoning(
    recipe: any,
    runeAlignment: number,
    agentCompatibility: number,
    tokenHarmony: number
  ): string[] {
    const reasons = []
    if (runeAlignment > 0.2) reasons.push('Aligned with current runic energy')
    if (agentCompatibility > 0.15) reasons.push('Agent-recommended preparation')
    if (tokenHarmony > 0.1) reasons.push('Harmonious token frequencies')
    return reasons.length > 0 ? reasons : ['Well-balanced recipe']
  }

  // More specialized calculation methods for recipes...

  private static calculateBaseRecipeScore(recipe: any, preferences: any): number {
    let score = 0.5

    // Cooking time preference
    if (preferences?.cookingTime === 'quick' && recipe.cookingTime <= 20) score += 0.2
    if (preferences?.cookingTime === 'moderate' && recipe.cookingTime <= 45) score += 0.1

    // Difficulty preference
    if (recipe.difficulty === 'easy') score += 0.1

    return score
  }

  private static calculateRecipeRuneAlignment(recipe: any, rune: RuneOfTheMoment): number {
    // Check if cooking method aligns with rune element
    const methodElementMapping = {
      // 'tilt skillet' is a dual-phase sear+braise method; filed under fire (its dominant
      // searing phase). See lib/cooking-methods.ts COOKING_METHODS['tilt-skillet'].
      fire: ['grilling', 'roasting', 'sautéing', 'tilt skillet'],
      water: ['steaming', 'poaching', 'braising'],
      earth: ['baking', 'slow cooking'],
      air: ['raw', 'light cooking', 'whipping'],
    }

    const alignedMethods =
      methodElementMapping[rune.element as keyof typeof methodElementMapping] || []
    return alignedMethods.some((method: string) =>
      recipe.cookingMethod.toLowerCase().includes(method)
    )
      ? 0.3
      : 0.1
  }

  private static calculateRecipeAgentCompatibility(
    recipe: any,
    agent: AgentRecommendation
  ): number {
    // Agent's culinary expertise influences compatibility
    return agent.overallScore / 400 // Small influence
  }

  private static calculateRecipeTokenHarmony(recipe: any, tokens: TokenCalculationResult): number {
    // Token harmony based on recipe complexity and token levels
    const complexity =
      recipe.difficulty === 'advanced' ? 0.8 : recipe.difficulty === 'moderate' ? 0.5 : 0.3
    const avgToken =
      Object.values(tokens.rates).reduce((sum, rate) => sum + rate, 0) /
      Object.keys(tokens.rates).length
    return Math.min(0.15, (avgToken * complexity) / 10)
  }

  // Description generators

  private static getRuneInfluenceDescription(cuisine: string, rune: RuneOfTheMoment): string {
    return `${rune.name} (${rune.element}) brings ${rune.element} energy to ${cuisine} cuisine`
  }

  private static getAgentGuidanceDescription(cuisine: string, agent: AgentRecommendation): string {
    return `${agent.name} recommends ${cuisine} for its alignment with your current consciousness state`
  }

  private static getTokenAlignmentDescription(
    cuisine: string,
    tokens: TokenCalculationResult
  ): string {
    const phase = tokens.marketPhase
    return `Current ${phase} token phase supports ${cuisine} cuisine energy`
  }

  private static getCuisineCharacteristics(cuisine: string): string[] {
    const characteristics = {
      Mediterranean: ['Fresh ingredients', 'Olive oil based', 'Seasonal'],
      Japanese: ['Minimal processing', 'Umami rich', 'Balanced presentation'],
      Italian: ['Simple preparations', 'Quality ingredients', 'Regional diversity'],
      Thai: ['Bold flavors', 'Balance of sweet/sour/salty', 'Fresh herbs'],
    }
    return characteristics[cuisine as keyof typeof characteristics] || ['Authentic flavors']
  }

  private static getSuggestedDishes(cuisine: string, element: string): string[] {
    // Element-influenced dish suggestions
    const baseDishesByElement = {
      fire: ['Spicy stir-fries', 'Grilled proteins', 'Warming soups'],
      water: ['Cooling salads', 'Poached dishes', 'Hydrating foods'],
      earth: ['Hearty stews', 'Roasted vegetables', 'Grain bowls'],
      air: ['Light salads', 'Raw preparations', 'Airy desserts'],
    }
    return baseDishesByElement[element as keyof typeof baseDishesByElement] || ['Balanced meals']
  }

  private static getCuisineCookingMethods(cuisine: string): string[] {
    const methods = {
      Mediterranean: ['Grilling', 'Roasting', 'Raw preparation'],
      Japanese: ['Steaming', 'Grilling', 'Raw (sashimi)'],
      Italian: ['Boiling (pasta)', 'Sautéing', 'Baking'],
      Thai: ['Stir-frying', 'Steaming', 'Raw (som tam)'],
    }
    return methods[cuisine as keyof typeof methods] || ['Various methods']
  }

  private static getRecipeRuneGuidance(recipe: any, rune: RuneOfTheMoment): string {
    return `Channel ${rune.element} energy while preparing this dish through mindful ${recipe.cookingMethod.toLowerCase()}`
  }

  private static getRecipeAgentTips(recipe: any, agent: AgentRecommendation): string[] {
    return [
      `${agent.name} suggests focusing on the energetic quality of ingredients`,
      'Prepare with conscious intention for optimal nourishment',
    ]
  }

  private static calculateRecipeEnergeticProperties(recipe: any, rune: RuneOfTheMoment) {
    return {
      element: rune.element,
      temperature:
        rune.element === 'fire'
          ? ('warming' as const)
          : rune.element === 'water'
            ? ('cooling' as const)
            : ('neutral' as const),
      mood:
        rune.element === 'fire'
          ? 'energizing'
          : rune.element === 'water'
            ? 'calming'
            : rune.element === 'earth'
              ? 'grounding'
              : 'uplifting',
    }
  }

  private static calculateOverallConfidence(
    tokens: TokenCalculationResult,
    runeAgent: any,
    influence: any
  ): number {
    const tokenReliability = tokens.metadata.source === 'backend' ? 0.9 : 0.7
    const runeAgentReliability = runeAgent.metadata.source === 'backend' ? 0.9 : 0.7

    return Math.round((tokenReliability + runeAgentReliability) * 50)
  }

  /**
   * Fallback recommendations when backend services fail
   */
  private static async generateFallbackRecommendations(
    request: RecommendationRequest,
    startTime: number
  ): Promise<EnhancedRecommendationResult> {
    // Basic recommendations without backend influence
    const basicCuisines: CuisineRecommendation[] = [
      {
        name: 'Mediterranean',
        score: 0.8,
        reasoning: ['Healthy and balanced'],
        runeInfluence: 'Earth energy supports grounding meals',
        agentGuidance: 'Recommended for balanced nutrition',
        tokenAlignment: 'Stable energy alignment',
        characteristics: ['Fresh ingredients', 'Olive oil based'],
        suggestedDishes: ['Greek salad', 'Grilled vegetables'],
        cookingMethods: ['Grilling', 'Raw preparation'],
        seasonalRelevance: 1.0,
      },
    ]

    return {
      cuisines: basicCuisines,
      ingredients: [],
      recipes: [],
      context: {
        rune: {
          id: 'fallback-rune',
          name: 'Universal Balance',
          symbol: '☯',
          description: 'A balanced rune for universal guidance',
          element: 'spirit',
          powerLevel: 50,
          guidance: 'Trust your intuition',
          culinaryInfluence: {
            element: 'Spirit',
            suggestions: ['Balanced meals'],
            avoid: ['Processed foods'],
            cookingMethods: ['Mindful preparation'],
            seasonalAlignment: 'All seasons',
          },
          activationWindow: {
            start: request.datetime,
            end: new Date(request.datetime.getTime() + 3600000),
            optimalMoment: new Date(request.datetime.getTime() + 1800000),
          },
        },
        agent: {
          agentId: 'fallback-agent',
          name: 'Universal Guide',
          title: 'Nutritional Advisor',
          resonanceScore: 70,
          personalityMatch: 70,
          temporalAlignment: 70,
          overallScore: 70,
          reasoning: ['Available for basic guidance'],
          culinarySpecialty: ['Balanced nutrition'],
          recommendedInteractionStyle: 'conversational',
        },
        tokens: {
          rates: { Spirit: 1.0, Essence: 0.8, Matter: 0.6, Substance: 0.4 },
          projections: [],
          harmonics: { phase: 0, amplitude: 1, resonance: 'neutral' },
          marketPhase: 'peak',
          volatilityIndex: 0.5,
          powerLevel: 0.5,
          totalValue: 2.8,
          metadata: {
            calculationTime: 0,
            source: 'local_fallback',
            planetaryHour: 'Sun',
            location: `${request.location.latitude},${request.location.longitude}`,
          },
        },
        influence: { runeWeight: 0.2, agentWeight: 0.2, tokenWeight: 0.1 },
      },
      metadata: {
        generationTime: Date.now() - startTime,
        totalRecommendations: 1,
        confidenceScore: 60,
      },
    }
  }
}
