-- On-chain ESMS claim ledger (reconciliation). id = claimId (off-chain debit
-- idempotency key + on-chain idempotency guard). Idempotent. See lib/esms-chain/.
CREATE TABLE IF NOT EXISTS "esms_claims" (
  "id"             TEXT NOT NULL,
  "user_id"        TEXT NOT NULL,
  "wallet_address" TEXT NOT NULL,
  "spirit"         DECIMAL(12,4) NOT NULL,
  "essence"        DECIMAL(12,4) NOT NULL,
  "matter"         DECIMAL(12,4) NOT NULL,
  "substance"      DECIMAL(12,4) NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "tx_hash"        TEXT,
  "network"        TEXT NOT NULL DEFAULT 'base-sepolia',
  "error"          TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "esms_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "esms_claims_user_id_idx" ON "esms_claims" ("user_id");
