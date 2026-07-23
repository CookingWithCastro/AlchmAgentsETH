import { generateIngredientImage } from './lib/ingredient-image-generator.js'

async function run() {
  const res = await generateIngredientImage({
    name: 'Saffron',
    slug: 'saffron',
    category: 'Spice',
    elementalProperties: { Fire: 0.65, Earth: 0.2, Water: 0.1, Air: 0.05 },
  })
  console.log(JSON.stringify(res, null, 2))
}

run().catch(console.error)
