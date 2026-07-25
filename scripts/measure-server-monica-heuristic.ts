/**
 * Exhaustive, read-only measurement of server.ts's disconnected Monica
 * heuristic over every four-element composition produced by its ten planets.
 *
 * Usage: bun run scripts/measure-server-monica-heuristic.ts
 */

type Tier = 'Emerging' | 'Developing' | 'Advanced' | 'Master'

function tier(value: number): Tier {
  if (value >= 8) return 'Master'
  if (value >= 6) return 'Advanced'
  if (value >= 4) return 'Developing'
  return 'Emerging'
}

const values: number[] = []
const tierCounts: Record<Tier, number> = {
  Emerging: 0,
  Developing: 0,
  Advanced: 0,
  Master: 0,
}

for (let fire = 0; fire <= 10; fire++) {
  for (let water = 0; water <= 10 - fire; water++) {
    for (let air = 0; air <= 10 - fire - water; air++) {
      const earth = 10 - fire - water - air
      const constitution = [air * 10, earth * 10, water * 10, fire * 10]
      const average = constitution.reduce((sum, value) => sum + value, 0) / 4
      const spread = constitution.reduce((sum, value) => sum + Math.abs(value - average), 0)
      const monica = Number(((average + spread / 4) / 12).toFixed(2))
      values.push(monica)
      tierCounts[tier(monica)]++
    }
  }
}

console.log(
  JSON.stringify(
    {
      basis: 'COMPUTED by exhaustive enumeration of 10-body four-element compositions',
      compositionCount: values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      tierCounts,
      unreachableTiers: (Object.entries(tierCounts) as Array<[Tier, number]>)
        .filter(([, count]) => count === 0)
        .map(([name]) => name),
    },
    null,
    2
  )
)
