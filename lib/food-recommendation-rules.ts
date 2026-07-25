// Food Recommendation Rules
// Based on Kalchm_Monica_Constant_Calculations.ipynb and astrological analysis

import type {
  AlchemicalProperties,
  ElementalProperties,
  ThermodynamicMetrics,
  AdvancedConstants,
} from './core-energy-rules'
import { ANumberCalculator } from './core-energy-rules'

export interface FoodProfile {
  name: string
  category: 'Building' | 'Clearing' | 'Balancing' | 'Transformative'
  elementalAffinity: {
    Fire?: number
    Water?: number
    Air?: number
    Earth?: number
  }
  alchemicalEffect: {
    Spirit?: number
    Essence?: number
    Matter?: number
    Substance?: number
  }
  energyType: 'Heating' | 'Cooling' | 'Neutral' | 'Drying' | 'Moistening'
  description: string
  contraindications?: string[]
}

export interface FoodRecommendations {
  primaryFoods: string[]
  supportiveFoods: string[]
  avoidFoods: string[]
  preparationMethods: string[]
  timingGuidance: string
  reasoning: string
  duration: string
}

/**
 * CORE FOOD CATEGORIES
 * Based on alchemical and elemental properties
 */
export const FOOD_PROFILES: Record<string, FoodProfile> = {
  // CLEARING FOODS - Light, detoxifying
  'Leafy Greens': {
    name: 'Leafy Greens (spinach, kale, arugula)',
    category: 'Clearing',
    elementalAffinity: { Air: 0.8, Water: 0.6 },
    alchemicalEffect: { Essence: 0.7, Spirit: 0.3 },
    energyType: 'Cooling',
    description: 'Light, cleansing foods that support detoxification and mental clarity',
  },

  'Citrus Fruits': {
    name: 'Citrus Fruits (lemon, lime, grapefruit)',
    category: 'Clearing',
    elementalAffinity: { Air: 0.9, Fire: 0.3 },
    alchemicalEffect: { Spirit: 0.8, Essence: 0.5 },
    energyType: 'Cooling',
    description: 'Cleansing and energizing, supports mental clarity and spirit',
  },

  'Herbal Teas': {
    name: 'Herbal Teas (green tea, chamomile, peppermint)',
    category: 'Clearing',
    elementalAffinity: { Air: 0.7, Water: 0.8 },
    alchemicalEffect: { Essence: 0.6, Spirit: 0.4 },
    energyType: 'Neutral',
    description: 'Gentle cleansing and calming, supports emotional balance',
  },

  Cucumber: {
    name: 'Cucumber and cooling vegetables',
    category: 'Clearing',
    elementalAffinity: { Water: 0.9, Earth: 0.3 },
    alchemicalEffect: { Essence: 0.8 },
    energyType: 'Cooling',
    description: 'Extremely cooling and clearing, reduces excess heat',
  },

  // BUILDING FOODS - Nourishing, strengthening
  'Whole Grains': {
    name: 'Whole Grains (quinoa, brown rice, oats)',
    category: 'Building',
    elementalAffinity: { Earth: 0.8, Water: 0.4 },
    alchemicalEffect: { Matter: 0.7, Substance: 0.6 },
    energyType: 'Neutral',
    description: 'Grounding and nourishing, builds physical strength and stability',
  },

  'Lean Proteins': {
    name: 'Lean Proteins (fish, chicken, legumes)',
    category: 'Building',
    elementalAffinity: { Fire: 0.6, Earth: 0.7 },
    alchemicalEffect: { Matter: 0.8, Substance: 0.5 },
    energyType: 'Heating',
    description: 'Strengthening and building, supports physical development',
  },

  'Root Vegetables': {
    name: 'Root Vegetables (carrots, sweet potatoes, beets)',
    category: 'Building',
    elementalAffinity: { Earth: 0.9, Fire: 0.3 },
    alchemicalEffect: { Matter: 0.6, Substance: 0.7 },
    energyType: 'Heating',
    description: 'Deeply grounding and nourishing, builds foundational energy',
  },

  'Nuts and Seeds': {
    name: 'Nuts and Seeds (almonds, walnuts, flax)',
    category: 'Building',
    elementalAffinity: { Earth: 0.7, Air: 0.4 },
    alchemicalEffect: { Substance: 0.8, Matter: 0.5 },
    energyType: 'Heating',
    description: 'Concentrated nourishment, builds substance and structure',
  },

  // BALANCING FOODS - Harmonizing
  'Seasonal Fruits': {
    name: 'Seasonal Fruits (apples, berries, melons)',
    category: 'Balancing',
    elementalAffinity: { Water: 0.6, Air: 0.5, Fire: 0.3 },
    alchemicalEffect: { Essence: 0.5, Spirit: 0.3 },
    energyType: 'Neutral',
    description: 'Harmonizing and moderately cleansing, supports balance',
  },

  'Steamed Vegetables': {
    name: 'Steamed Vegetables (broccoli, cauliflower, zucchini)',
    category: 'Balancing',
    elementalAffinity: { Water: 0.5, Earth: 0.5, Air: 0.3 },
    alchemicalEffect: { Essence: 0.4, Matter: 0.4 },
    energyType: 'Neutral',
    description: 'Gentle and balanced, supports overall harmony',
  },

  // TRANSFORMATIVE FOODS - Dynamic change
  'Fermented Foods': {
    name: 'Fermented Foods (sauerkraut, kimchi, kefir)',
    category: 'Transformative',
    elementalAffinity: { Water: 0.7, Fire: 0.5 },
    alchemicalEffect: { Spirit: 0.6, Essence: 0.7 },
    energyType: 'Heating',
    description: 'Dynamic transformation, supports digestive and spiritual change',
  },

  'Spices and Herbs': {
    name: 'Warming Spices (ginger, turmeric, cinnamon)',
    category: 'Transformative',
    elementalAffinity: { Fire: 0.8, Air: 0.6 },
    alchemicalEffect: { Spirit: 0.8, Matter: 0.3 },
    energyType: 'Heating',
    description: 'Catalytic transformation, activates change and circulation',
  },

  // FOODS TO AVOID DURING CLEARING
  'Heavy Proteins': {
    name: 'Heavy Proteins (red meat, processed meats)',
    category: 'Building',
    elementalAffinity: { Fire: 0.8, Earth: 0.8 },
    alchemicalEffect: { Matter: 0.9, Substance: 0.7 },
    energyType: 'Heating',
    description: 'Very building and heating, can create stagnation during clearing',
    contraindications: [
      'Negative alchemical states',
      'Excess heat conditions',
      'Digestive stagnation',
    ],
  },

  'Processed Foods': {
    name: 'Processed and Packaged Foods',
    category: 'Building',
    elementalAffinity: { Earth: 0.6 },
    alchemicalEffect: { Substance: 0.8 },
    energyType: 'Neutral',
    description: 'Creates stagnation and blocks natural energy flow',
    contraindications: ['All clearing states', 'Low energy conditions', 'Digestive issues'],
  },

  'Heavy Dairy': {
    name: 'Heavy Dairy Products (cheese, cream, ice cream)',
    category: 'Building',
    elementalAffinity: { Water: 0.7, Earth: 0.6 },
    alchemicalEffect: { Matter: 0.6, Substance: 0.8 },
    energyType: 'Cooling',
    description: 'Mucus-forming and stagnating, blocks clearing processes',
    contraindications: ['Respiratory issues', 'Clearing phases', 'Excessive water element'],
  },
}

/**
 * KALCHM AND MONICA CONSTANT FOOD ANALYZER
 * Determines food recommendations based on advanced constants
 */
export class KalchmFoodAnalyzer {
  static analyzeFoodNeeds(
    alchemical: AlchemicalProperties,
    elemental: ElementalProperties,
    thermodynamics: ThermodynamicMetrics,
    constants: AdvancedConstants,
    dietaryPreferences?: any
  ): FoodRecommendations {
    const { kalchmConstant, monicaConstant } = constants
    const { energy } = thermodynamics
    const totalAlchemical =
      alchemical.spirit + alchemical.essence + alchemical.matter + alchemical.substance

    // Determine primary food strategy
    let primaryStrategy: 'Clearing' | 'Building' | 'Balancing' | 'Transformative'
    let reasoning = ''

    // Analysis based on constants and energy state
    if (totalAlchemical < 0) {
      primaryStrategy = 'Clearing'
      reasoning = 'Negative alchemical values indicate need for clearing and release. '
    } else if (energy > 0.1) {
      primaryStrategy = 'Transformative'
      reasoning = "High Greg's Energy supports dynamic transformation. "
    } else if (energy < -0.1) {
      primaryStrategy = 'Building'
      reasoning = "Low Greg's Energy requires nourishing and building foods. "
    } else {
      primaryStrategy = 'Balancing'
      reasoning = 'Neutral energy state benefits from balanced approach. '
    }

    // Kalchm constant analysis
    if (kalchmConstant < 0) {
      reasoning +=
        'Negative Kalchm constant suggests system in dynamic tension, favoring lighter foods. '
    } else if (kalchmConstant > 1) {
      reasoning += 'High Kalchm constant indicates stability, can handle heavier foods. '
    }

    // Monica constant analysis
    if (monicaConstant !== null && monicaConstant < 0) {
      reasoning +=
        'Negative Monica constant suggests resistance to change - gentle approach needed. '
    } else if (monicaConstant !== null && monicaConstant > 1) {
      reasoning +=
        'High Monica constant supports dynamic transformation - catalytic foods beneficial. '
    }

    const recommendations = this.generateRecommendations(
      primaryStrategy,
      elemental,
      reasoning,
      constants
    )

    // Apply dietary preferences if provided
    if (dietaryPreferences?.restrictions) {
      const restrictions = Array.isArray(dietaryPreferences.restrictions)
        ? dietaryPreferences.restrictions.map((r: string) => r.toLowerCase())
        : []

      if (restrictions.includes('vegan')) {
        recommendations.primaryFoods = recommendations.primaryFoods.filter(
          f => !f.toLowerCase().includes('protein') || f.toLowerCase().includes('fish') === false
        )
        recommendations.avoidFoods.push('Meat', 'Dairy', 'Eggs')
      }

      if (restrictions.includes('gluten-free')) {
        recommendations.primaryFoods = recommendations.primaryFoods.filter(
          f => !f.toLowerCase().includes('grain')
        )
        recommendations.avoidFoods.push('Gluten', 'Wheat', 'Barley', 'Rye')
      }
    }

    return recommendations
  }

  private static generateRecommendations(
    strategy: 'Clearing' | 'Building' | 'Balancing' | 'Transformative',
    elemental: ElementalProperties,
    reasoning: string,
    constants: AdvancedConstants
  ): FoodRecommendations {
    const foods = Object.values(FOOD_PROFILES)

    let primaryFoods: string[] = []
    let supportiveFoods: string[] = []
    let avoidFoods: string[] = []
    let preparationMethods: string[] = []
    let timingGuidance = ''
    let duration = ''

    switch (strategy) {
      case 'Clearing':
        primaryFoods = [
          'Leafy Greens',
          'Citrus Fruits',
          'Herbal Teas',
          'Cucumber',
          'Seasonal Fruits',
        ]
        supportiveFoods = [
          'Steamed Vegetables',
          'Light soups and broths',
          'Ginger tea for digestion',
        ]
        avoidFoods = [
          'Heavy Proteins',
          'Heavy Dairy',
          'Processed Foods',
          'Excess oils and fats',
          'Alcohol and stimulants',
        ]
        preparationMethods = [
          'Raw preparations when possible',
          'Light steaming',
          'Fresh juicing',
          'Herbal infusions',
          'Minimal seasoning',
        ]
        timingGuidance = 'Eat lighter, more frequent meals. Stop eating 3 hours before sleep.'
        duration = 'Continue until alchemical values return to positive or neutral'
        break

      case 'Building':
        primaryFoods = ['Whole Grains', 'Lean Proteins', 'Root Vegetables', 'Nuts and Seeds']
        supportiveFoods = ['Seasonal Fruits', 'Steamed Vegetables', 'Warming spices in moderation']
        avoidFoods = [
          'Excessive raw foods',
          'Too many cooling foods',
          'Processed sugars',
          'Excessive caffeine',
        ]
        preparationMethods = [
          'Slow cooking and stewing',
          'Roasting and baking',
          'Warm preparations',
          'Combination cooking',
          'Nourishing broths',
        ]
        timingGuidance = 'Regular, substantial meals. Largest meal at midday.'
        duration = 'Continue until energy levels stabilize and improve'
        break

      case 'Balancing':
        primaryFoods = [
          'Seasonal Fruits',
          'Steamed Vegetables',
          'Whole Grains',
          'Moderate amounts of lean protein',
        ]
        supportiveFoods = [
          'Light dairy if tolerated',
          'Herbal teas',
          'Nuts and seeds in moderation',
        ]
        avoidFoods = [
          'Extreme foods (too hot or cold)',
          'Excessive amounts of any category',
          'Highly processed foods',
        ]
        preparationMethods = [
          'Balanced cooking methods',
          'Moderate seasoning',
          'Combination of raw and cooked',
          'Seasonal preparation styles',
        ]
        timingGuidance = 'Regular, moderate meals aligned with natural rhythms.'
        duration = 'Ongoing maintenance approach'
        break

      case 'Transformative':
        primaryFoods = ['Fermented Foods', 'Spices and Herbs', 'Variety of seasonal foods']
        supportiveFoods = [
          'Foods from multiple categories',
          'Experimental combinations',
          'Traditional medicinal foods',
        ]
        avoidFoods = [
          'Stagnating foods',
          'Overly routine eating patterns',
          'Foods that create heaviness',
        ]
        preparationMethods = [
          'Dynamic cooking methods',
          'Fermentation and sprouting',
          'Creative combinations',
          'Traditional preparation methods',
        ]
        timingGuidance = 'Intuitive eating aligned with energy cycles.'
        duration = 'During active transformation periods'
        break
    }

    // Adjust for elemental imbalances
    const elementalAdjustments = this.getElementalAdjustments(elemental)
    if (elementalAdjustments.addFoods.length > 0) {
      supportiveFoods.push(...elementalAdjustments.addFoods)
    }
    if (elementalAdjustments.avoidFoods.length > 0) {
      avoidFoods.push(...elementalAdjustments.avoidFoods)
    }

    return {
      primaryFoods,
      supportiveFoods,
      avoidFoods,
      preparationMethods,
      timingGuidance,
      reasoning,
      duration,
    }
  }

  private static getElementalAdjustments(elemental: ElementalProperties): {
    addFoods: string[]
    avoidFoods: string[]
  } {
    const addFoods: string[] = []
    const avoidFoods: string[] = []

    // Check for deficient elements (very negative values)
    if (elemental.fire < -3) {
      addFoods.push('Warming spices and foods', 'Ginger and cinnamon')
      avoidFoods.push('Cold and raw foods', 'Iced beverages')
    }

    if (elemental.water < -3) {
      addFoods.push('Hydrating foods', 'Soups and broths', 'Juicy fruits')
      avoidFoods.push('Dehydrating foods', 'Excessive salt', 'Alcohol')
    }

    if (elemental.air < -3) {
      addFoods.push('Light, easily digestible foods', 'Fresh herbs')
      avoidFoods.push('Heavy, dense foods', 'Excessive fats')
    }

    if (elemental.earth < -3) {
      addFoods.push('Grounding root vegetables', 'Whole grains', 'Protein-rich foods')
      avoidFoods.push('Stimulating foods', 'Excessive raw foods')
    }

    return { addFoods, avoidFoods }
  }
}

/**
 * MEAL TIMING BASED ON PLANETARY HOURS
 * Integrates planetary influence with food recommendations
 */
export class PlanetaryMealTiming {
  static getOptimalMealTiming(currentPlanet: string): {
    mealType: string
    foods: string[]
    preparation: string
    timing: string
  } {
    const planetaryFoodMap: Record<
      string,
      {
        mealType: string
        foods: string[]
        preparation: string
        timing: string
      }
    > = {
      Sun: {
        mealType: 'Energizing breakfast or lunch',
        foods: ['Citrus fruits', 'Whole grains', 'Golden foods like turmeric'],
        preparation: 'Bright, fresh, and warming',
        timing: 'Best for main meals of the day',
      },
      Moon: {
        mealType: 'Nurturing and cooling foods',
        foods: ['Dairy products', 'White foods', 'Soft fruits', 'Herbal teas'],
        preparation: 'Gentle cooking, steaming, or raw',
        timing: 'Evening meals and emotional eating',
      },
      Mercury: {
        mealType: 'Light, easily digestible',
        foods: ['Leafy greens', 'Light grains', 'Nuts and seeds'],
        preparation: 'Quick, simple preparation',
        timing: 'Quick meals and snacks',
      },
      Venus: {
        mealType: 'Beautiful, harmonious meals',
        foods: ['Sweet fruits', 'Beautiful vegetables', 'Moderate indulgences'],
        preparation: 'Artistic presentation, balanced flavors',
        timing: 'Social meals and treats',
      },
      Mars: {
        mealType: 'Energizing and strengthening',
        foods: ['Protein-rich foods', 'Spicy foods', 'Red foods'],
        preparation: 'High-heat cooking, grilling, roasting',
        timing: 'Pre-workout meals, active periods',
      },
      Jupiter: {
        mealType: 'Abundant, nourishing feast',
        foods: ['Rich foods', 'Purple foods', 'Celebration foods'],
        preparation: 'Generous portions, traditional methods',
        timing: 'Celebration meals, expansion periods',
      },
      Saturn: {
        mealType: 'Simple, structured nutrition',
        foods: ['Basic whole foods', 'Root vegetables', 'Traditional foods'],
        preparation: 'Slow cooking, traditional preparation',
        timing: 'Regular, disciplined meal schedule',
      },
    }

    return planetaryFoodMap[currentPlanet] || planetaryFoodMap.Sun
  }
}

/**
 * SEASONAL FOOD ADJUSTMENTS
 * Modify recommendations based on natural cycles
 */
export class SeasonalFoodAdjustments {
  static adjustForSeason(
    baseRecommendations: FoodRecommendations,
    season: 'Spring' | 'Summer' | 'Autumn' | 'Winter'
  ): FoodRecommendations {
    const adjusted = { ...baseRecommendations }

    switch (season) {
      case 'Spring':
        adjusted.supportiveFoods.push(
          'Bitter greens for cleansing',
          'Fresh sprouts',
          'Light detox foods'
        )
        adjusted.preparationMethods.push('Fresh and raw preparations increasing')
        break

      case 'Summer':
        adjusted.supportiveFoods.push('Cooling foods', 'Fresh fruits', 'Salads and raw foods')
        adjusted.preparationMethods.push('Cold preparations', 'Fresh serving', 'Minimal cooking')
        break

      case 'Autumn':
        adjusted.supportiveFoods.push(
          'Grounding foods',
          'Squashes and root vegetables',
          'Warming spices'
        )
        adjusted.preparationMethods.push('Roasting and baking', 'Warming preparation')
        break

      case 'Winter':
        adjusted.supportiveFoods.push('Warming foods', 'Stored grains', 'Hot soups and stews')
        adjusted.preparationMethods.push('Slow cooking', 'Warming spices', 'Hot preparations')
        break
    }

    return adjusted
  }
}
