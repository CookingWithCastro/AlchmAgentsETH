-- Privy DID: shared cross-site identity (did:privy:...) on the users table.
-- Same value per person across PA + alchm.kitchen (shared Privy app) → stable
-- provider-agnostic join key. Idempotent. See lib/privy/.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privy_did" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_privy_did_key" ON "users" ("privy_did");
