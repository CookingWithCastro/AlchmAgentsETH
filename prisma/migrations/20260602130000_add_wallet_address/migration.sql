-- Privy embedded wallet address (EVM / Base) on the users table.
-- Provisioned when a user connects Privy with embedded wallets enabled; funded
-- via Privy's fiat on-ramp. Non-unique, nullable. Idempotent. See lib/privy/.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" TEXT;
