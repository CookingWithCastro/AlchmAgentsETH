-- BYOK provider keys: a user's own OpenAI/Anthropic Console API key, encrypted
-- at rest (AES-256-GCM). Plaintext is never stored. Surfaced fields: last4,
-- validated_at. See lib/byok/.
CREATE TABLE IF NOT EXISTS "user_provider_keys" (
  "id"           TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "provider"     TEXT NOT NULL,
  "ciphertext"   TEXT NOT NULL,
  "iv"           TEXT NOT NULL,
  "auth_tag"     TEXT NOT NULL,
  "last4"        TEXT NOT NULL,
  "validated_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_provider_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_provider_keys_user_id_provider_key"
  ON "user_provider_keys" ("user_id", "provider");

CREATE INDEX IF NOT EXISTS "user_provider_keys_user_id_idx"
  ON "user_provider_keys" ("user_id");
