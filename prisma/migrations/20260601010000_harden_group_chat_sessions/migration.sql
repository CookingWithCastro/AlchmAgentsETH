-- Harden group_chat_sessions against duplicate / runaway transit-council spend.
--
-- Two additive columns + one unique index, all idempotent (IF NOT EXISTS), touching
-- no existing data:
--   * seeded_at  — server-side one-time gate for the auto-convened council opener.
--                  Claimed atomically (UPDATE ... WHERE seeded_at IS NULL), so the
--                  opener fires exactly once per session regardless of fresh browsers /
--                  incognito / cleared localStorage (replaces the client-only guard).
--   * dedupe_key — deterministic "(transit, user, ~6h bucket)" key. A concurrent
--                  double-create now collides on this unique index instead of inserting
--                  two sessions; the loser reads back the winner. NULL for keyless
--                  sessions (a unique index permits many NULLs in Postgres).
--
-- Existing rows keep seeded_at = NULL (still eligible to seed once) and dedupe_key = NULL.
-- Additive + IF NOT EXISTS only, so this is safe to apply via `prisma db execute`
-- against Neon and record with `prisma migrate resolve` (see repo CLAUDE.md / the
-- group_chat_sessions create migration, which was applied the same way).

ALTER TABLE "group_chat_sessions" ADD COLUMN IF NOT EXISTS "seeded_at" TIMESTAMPTZ;
ALTER TABLE "group_chat_sessions" ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;

-- Concurrency guard for create; name matches Prisma's default for `dedupeKey @unique`.
CREATE UNIQUE INDEX IF NOT EXISTS "group_chat_sessions_dedupe_key_key"
    ON "group_chat_sessions"("dedupe_key");
