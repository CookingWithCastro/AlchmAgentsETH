async function probe(url: string, options: any = {}) {
  try {
    const res = await fetch(url, options)
    console.log(`📡 [${res.status}] ${url}`)
    if (res.ok) {
      const text = await res.text()
      console.log(`   Response preview: ${text.slice(0, 150)}...\n`)
    } else {
      console.log(`   Error: ${res.statusText}\n`)
    }
  } catch (error: any) {
    console.log(`💥 Failed to fetch ${url}: ${error.message}\n`)
  }
}

async function main() {
  console.log('🔍 Probing live site API endpoints...\n')

  await probe('https://agents.alchm.kitchen/api/planetary-positions')
  await probe('https://agents.alchm.kitchen/api/agents')
  await probe('https://api.agents.alchm.kitchen/health')
  await probe('https://api.agents.alchm.kitchen/api/providers/health')
  await probe('https://agents.alchm.kitchen/api/planetary-positions/metrics')
}

main()
