-- group_chat_sessions: transit-driven group chats opened from alchm.kitchen.
-- A click on a displayed transit resolves the two transiting planets to canonical
-- degree-agent IDs (planetary-{planet}-{sign}-{degree}) and POSTs them to
-- POST /api/internal/group-chat, which stores a session here and returns a
-- /gallery/group/<id> URL. The group page hydrates the session and pre-populates
-- the council. Additive, idempotent (IF NOT EXISTS) — touches no existing tables.

CREATE TABLE IF NOT EXISTS "group_chat_sessions" (
    "id"          TEXT        NOT NULL,
    "agent_ids"   JSONB       NOT NULL,
    "agents"      JSONB,
    "transit"     JSONB,
    "transit_key" TEXT,
    "origin"      TEXT,
    "source"      TEXT,
    "user_id"     TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- Idempotency lookup: most recent session for a given transit + user bucket.
CREATE INDEX IF NOT EXISTS "group_chat_sessions_transit_key_user_id_idx"
    ON "group_chat_sessions"("transit_key", "user_id");

-- Recency scans (admin / cleanup).
CREATE INDEX IF NOT EXISTS "group_chat_sessions_created_at_idx"
    ON "group_chat_sessions"("created_at" DESC);

-- NOTE: no FK on user_id — it is best-effort cross-app attribution (an
-- alchm.kitchen user id that need not exist in this DB's "users" table).
