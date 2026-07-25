export function finiteMonica(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function averageFiniteMonica(values: Iterable<unknown>): number | null {
  let total = 0
  let count = 0
  for (const value of values) {
    const monica = finiteMonica(value)
    if (monica === null) continue
    total += monica
    count += 1
  }
  return count === 0 ? null : total / count
}

export function sumFiniteMonica(values: Iterable<unknown>): number | null {
  let total = 0
  let count = 0
  for (const value of values) {
    const monica = finiteMonica(value)
    if (monica === null) continue
    total += monica
    count += 1
  }
  return count === 0 ? null : total
}

export function formatMonica(value: unknown, fractionDigits?: number): string {
  const monica = finiteMonica(value)
  if (monica === null) return 'not computed'
  return fractionDigits === undefined ? String(monica) : monica.toFixed(fractionDigits)
}
