import { agentActionService } from '../lib/services/agent-action-service'

async function main() {
  console.log('Running daily yield...')
  const summary = await agentActionService.runDailyYieldForAgents()
  console.log('Summary:', summary)
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
