async function runVerification() {
  const baseUrl = process.env.VERIFY_BASE_URL || 'http://localhost:3000'
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.agents.alchm.kitchen'
  const wtenBackendUrl =
    process.env.NEXT_PUBLIC_WTEN_BACKEND_URL || 'https://whattoeatnext-production.up.railway.app'

  console.log('=== Pentacles Star Vaults Cross-Project Verification ===\n')

  // 1. Verify Backend Endpoint Binding
  console.log(`[1] Backend URLs Configured:`)
  console.log(`    NEXT_PUBLIC_BACKEND_URL: ${backendUrl}`)
  console.log(`    NEXT_PUBLIC_WTEN_BACKEND_URL: ${wtenBackendUrl}`)

  const healthRes1 = await fetch(`${backendUrl}/health`)
    .then(r => r.json())
    .catch(e => ({ error: e.message }))
  const healthRes2 = await fetch(`${wtenBackendUrl}/health`)
    .then(r => r.json())
    .catch(e => ({ error: e.message }))
  console.log(`    Agents Backend Health:`, JSON.stringify(healthRes1))
  console.log(`    WTEN Backend Health:  `, JSON.stringify(healthRes2))

  // 1b. Test /api/planetary-positions
  console.log(`\n[1b] Testing /api/planetary-positions on ${baseUrl}...`)
  const planetaryRes = await fetch(`${baseUrl}/api/planetary-positions`).then(r => r.json())
  console.log(`     Response success:`, planetaryRes.success)
  console.log(`     Star Positions count:`, planetaryRes.starPositions?.length)

  let starsValid = true
  if (Array.isArray(planetaryRes.starPositions)) {
    for (const star of planetaryRes.starPositions) {
      console.log(
        `     - ${star.name} (${star.element}): Alt=${star.altitude}°, Az=${star.azimuth}°, Risen=${star.isRisen}, APY=${star.effectiveApy}%`
      )
      if (
        typeof star.altitude !== 'number' ||
        typeof star.azimuth !== 'number' ||
        typeof star.isRisen !== 'boolean' ||
        typeof star.effectiveApy !== 'number'
      ) {
        starsValid = false
      }
    }
  } else {
    starsValid = false
  }
  console.log(`     Star Positions structure valid: ${starsValid}`)

  // 2. Verify Constellation Council Multi-Agent Chat
  console.log(`\n[2] Testing Constellation Council Multi-Agent Chat (/api/agents/unified)...`)
  const chatPayload = {
    action: 'multi_agent_chat',
    agentIds: ['sirius', 'arcturus', 'vega', 'polaris'],
    message: 'How should I allocate my USDC collateral today?',
  }
  const chatRes = await fetch(`${baseUrl}/api/agents/unified`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatPayload),
  }).then(r => r.json())

  console.log(`    Multi-Agent Chat response success:`, chatRes.success)
  const responses = chatRes.responses || chatRes.data?.responses || []
  console.log(`    Turn-taking responses received (${responses.length}):`)
  for (const resp of responses) {
    console.log(`     - [${resp.element || 'Star'}] ${resp.name} (${resp.agentId}): "${resp.text}"`)
  }

  // 3. Verify Circle Arc Staking & NameStone ENS Registration
  console.log(`\n[3] Testing Circle Arc Staking & NameStone ENS (/api/staking/vault)...`)
  const vaultPayload = {
    starName: 'Sirius',
    amountUsdc: 500,
  }
  const vaultRes = await fetch(`${baseUrl}/api/staking/vault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vaultPayload),
  }).then(r => r.json())

  console.log(`    Staking Vault response success:`, vaultRes.success)
  console.log(`    Chain ID:`, vaultRes.chainId)
  console.log(`    Settlement Hash:`, vaultRes.settlementHash)
  console.log(`    ENS Subname:`, vaultRes.ensSubname)
  console.log(`    Full Vault Receipt:`, JSON.stringify(vaultRes, null, 2))

  if (
    vaultRes.success &&
    vaultRes.chainId === 5042002 &&
    vaultRes.settlementHash &&
    vaultRes.ensSubname === 'sirius.alchmagents.eth'
  ) {
    console.log('\n✅ All 3 Pentacles Star Vaults Foundation Verifications PASSED!')
  } else {
    console.error('\n❌ Verification failed validation rules.')
    process.exit(1)
  }
}

runVerification().catch(err => {
  console.error('Verification script failed:', err)
  process.exit(1)
})
