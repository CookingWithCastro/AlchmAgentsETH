// Server-side seed idempotency + create-concurrency for transit group sessions.
// Prisma is mocked so we exercise the claim/race logic without a live DB. These cover
// the two P1 abuse vectors: (1) the auto-seed must fire once per session, and (2) two
// concurrent creates for the same transit must collapse to a single session.

import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  group_chat_sessions: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

import { createTransitGroupSession, claimGroupChatSeed } from '@/lib/agents/transit-group-session'

const ROW = {
  id: 'sess-1',
  agentIds: ['planetary-sun-aries-10', 'planetary-moon-leo-5'],
  agents: [],
  transit: { key: 'sun-trine-moon', label: 'Sun trine Moon' },
  origin: null,
  source: null,
  userId: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
}

const INPUT = {
  agentIds: ROW.agentIds,
  agents: [],
  transit: { key: 'sun-trine-moon', label: 'Sun trine Moon', aspect: 'trine' },
  origin: null,
  source: null,
  userId: null,
} as Parameters<typeof createTransitGroupSession>[0]

describe('claimGroupChatSeed — server-side one-time gate', () => {
  beforeEach(() => {
    prismaMock.group_chat_sessions.updateMany.mockReset()
  })

  it('returns true when exactly one row flips seeded_at NULL → now()', async () => {
    prismaMock.group_chat_sessions.updateMany.mockResolvedValue({ count: 1 })
    expect(await claimGroupChatSeed('sess-1')).toBe(true)
    expect(prismaMock.group_chat_sessions.updateMany).toHaveBeenCalledWith({
      where: { id: 'sess-1', seededAt: null },
      data: { seededAt: expect.any(Date) },
    })
  })

  it('returns false on a second/concurrent claim (already seeded → 0 rows)', async () => {
    prismaMock.group_chat_sessions.updateMany.mockResolvedValue({ count: 0 })
    expect(await claimGroupChatSeed('sess-1')).toBe(false)
  })

  it('fails closed (false) when the update throws', async () => {
    prismaMock.group_chat_sessions.updateMany.mockRejectedValue(new Error('db down'))
    expect(await claimGroupChatSeed('sess-1')).toBe(false)
  })

  it('returns false for an empty id without touching the db', async () => {
    expect(await claimGroupChatSeed('')).toBe(false)
    expect(prismaMock.group_chat_sessions.updateMany).not.toHaveBeenCalled()
  })
})

describe('createTransitGroupSession — concurrency dedupe', () => {
  beforeEach(() => {
    prismaMock.group_chat_sessions.create.mockReset()
    prismaMock.group_chat_sessions.findUnique.mockReset()
  })

  it('persists a dedupe_key derived from transit + user + window bucket', async () => {
    prismaMock.group_chat_sessions.create.mockResolvedValue(ROW)
    await createTransitGroupSession(INPUT)
    const { data } = prismaMock.group_chat_sessions.create.mock.calls[0][0]
    expect(typeof data.dedupeKey).toBe('string')
    expect(data.dedupeKey).toContain('sun-trine-moon')
    expect(data.dedupeKey).toContain('anon') // anonymous user bucket
  })

  it('on a lost race (P2002) reads back and returns the winning session', async () => {
    const winner = { ...ROW, id: 'winner' }
    prismaMock.group_chat_sessions.create.mockRejectedValue({ code: 'P2002' })
    prismaMock.group_chat_sessions.findUnique.mockResolvedValue(winner)

    const result = await createTransitGroupSession(INPUT)
    expect(result.id).toBe('winner')
    expect(prismaMock.group_chat_sessions.findUnique).toHaveBeenCalledWith({
      where: { dedupeKey: expect.stringContaining('sun-trine-moon') },
    })
  })

  it('two parallel creates collapse to a single session', async () => {
    const winner = { ...ROW, id: 'winner' }
    // One INSERT wins; the other hits the unique constraint and reads back the winner.
    prismaMock.group_chat_sessions.create
      .mockResolvedValueOnce(winner)
      .mockRejectedValueOnce({ code: 'P2002' })
    prismaMock.group_chat_sessions.findUnique.mockResolvedValue(winner)

    const [a, b] = await Promise.all([
      createTransitGroupSession(INPUT),
      createTransitGroupSession(INPUT),
    ])
    expect(a.id).toBe('winner')
    expect(b.id).toBe('winner')
    expect(prismaMock.group_chat_sessions.create).toHaveBeenCalledTimes(2)
  })

  it('re-throws non-unique errors instead of swallowing them', async () => {
    prismaMock.group_chat_sessions.create.mockRejectedValue(new Error('connection reset'))
    await expect(createTransitGroupSession(INPUT)).rejects.toThrow('connection reset')
    expect(prismaMock.group_chat_sessions.findUnique).not.toHaveBeenCalled()
  })

  it('keyless sessions (no transit key) create with a null dedupe_key', async () => {
    prismaMock.group_chat_sessions.create.mockResolvedValue({ ...ROW, transit: null })
    await createTransitGroupSession({ ...INPUT, transit: null })
    const { data } = prismaMock.group_chat_sessions.create.mock.calls[0][0]
    expect(data.dedupeKey).toBeNull()
  })
})
