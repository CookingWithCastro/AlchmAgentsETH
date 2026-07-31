CREATE TABLE "solana_service_heartbeat" (
    "service" TEXT NOT NULL,
    "connection_status" TEXT NOT NULL,
    "active_rpc" TEXT,
    "reconnect_attempts" INTEGER NOT NULL DEFAULT 0,
    "queue_depth" INTEGER NOT NULL DEFAULT 0,
    "last_processed_slot" BIGINT,
    "last_error" TEXT,
    "heartbeat_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "solana_service_heartbeat_pkey" PRIMARY KEY ("service")
);

CREATE INDEX "solana_service_heartbeat_heartbeat_at_idx"
    ON "solana_service_heartbeat"("heartbeat_at");
