-- CreateTable: World ID proof-of-personhood persistence. The nullifier_hash is
-- unique per (human, app, action); a PK on it enforces one-verified-human
-- across sessions, and the user binding blocks nullifier reuse across accounts.
CREATE TABLE "world_id_verifications" (
    "nullifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "agent_id" TEXT,
    "verification_level" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "world_id_verifications_pkey" PRIMARY KEY ("nullifier")
);

-- CreateIndex
CREATE INDEX "world_id_verifications_user_id_idx" ON "world_id_verifications"("user_id");
CREATE INDEX "world_id_verifications_agent_id_idx" ON "world_id_verifications"("agent_id");
