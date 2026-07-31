CREATE TABLE "verified_solana_wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "solana_pub_key" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verified_solana_wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processed_tx" (
    "signature" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_tx_pkey" PRIMARY KEY ("signature")
);

CREATE TABLE "solana_wallet_challenge" (
    "nonce" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "solana_wallet_challenge_pkey" PRIMARY KEY ("nonce")
);

CREATE TABLE "bridge_transfer" (
    "claim_id" TEXT NOT NULL,
    "source_chain" TEXT NOT NULL,
    "target_chain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "source_tx_hash" TEXT,
    "source_address" TEXT,
    "target_address" TEXT,
    "source_receipt_id" TEXT,
    "source_slot" BIGINT,
    "element_id" INTEGER,
    "destination_tx_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "bridge_transfer_pkey" PRIMARY KEY ("claim_id")
);

CREATE TABLE "solana_sync_outbox" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "event_index" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "solana_sync_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verified_solana_wallet_user_id_key"
    ON "verified_solana_wallet"("user_id");
CREATE UNIQUE INDEX "verified_solana_wallet_solana_pub_key_key"
    ON "verified_solana_wallet"("solana_pub_key");
CREATE INDEX "processed_tx_event_type_processed_at_idx"
    ON "processed_tx"("event_type", "processed_at" DESC);
CREATE INDEX "solana_wallet_challenge_user_id_created_at_idx"
    ON "solana_wallet_challenge"("user_id", "created_at" DESC);
CREATE INDEX "solana_wallet_challenge_expires_at_idx"
    ON "solana_wallet_challenge"("expires_at");
CREATE UNIQUE INDEX "bridge_transfer_source_tx_hash_key"
    ON "bridge_transfer"("source_tx_hash");
CREATE INDEX "bridge_transfer_status_updated_at_idx"
    ON "bridge_transfer"("status", "updated_at");
CREATE UNIQUE INDEX "solana_sync_outbox_signature_event_index_key"
    ON "solana_sync_outbox"("signature", "event_index");
CREATE INDEX "solana_sync_outbox_delivered_at_created_at_idx"
    ON "solana_sync_outbox"("delivered_at", "created_at");
