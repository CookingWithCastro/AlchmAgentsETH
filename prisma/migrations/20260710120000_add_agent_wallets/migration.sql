-- CreateTable
CREATE TABLE "agent_wallets" (
    "agent_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'base-sepolia',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_wallets_pkey" PRIMARY KEY ("agent_id")
);

-- CreateIndex
CREATE INDEX "agent_wallets_address_idx" ON "agent_wallets"("address");
