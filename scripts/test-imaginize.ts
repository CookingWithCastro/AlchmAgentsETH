import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function main() {
  const start = Date.now()
  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt: 'A beautiful culinary photo of saffron',
    size: '1024x1024',
    quality: 'standard',
    n: 1,
  })
  console.log(res.data[0].url)
  console.log(`Took ${Date.now() - start}ms`)
}
main().catch(console.error)
