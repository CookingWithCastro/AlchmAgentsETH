import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  console.log('🔗 Connecting to database to create missing WTEN tables...')

  try {
    await prisma.$connect()
    console.log('✅ Connected. Creating tables...')

    // Create token_balances table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "token_balances" (
        "user_id" UUID PRIMARY KEY,
        "spirit" DECIMAL(12, 4) NOT NULL,
        "essence" DECIMAL(12, 4) NOT NULL,
        "matter" DECIMAL(12, 4) NOT NULL,
        "substance" DECIMAL(12, 4) NOT NULL,
        "last_daily_claim_at" TIMESTAMPTZ,
        "last_daily_claim_agents_at" TIMESTAMPTZ,
        "updated_at" TIMESTAMPTZ NOT NULL
      );
    `)
    console.log('✅ Created "token_balances" table if it did not exist.')

    // Create token_transactions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "token_transactions" (
        "id" BIGSERIAL PRIMARY KEY,
        "transaction_group_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "token_type" VARCHAR(20) NOT NULL,
        "amount" DECIMAL(12, 4) NOT NULL,
        "source_type" VARCHAR(50) NOT NULL,
        "source_id" VARCHAR(255),
        "description" TEXT,
        "idempotency_key" VARCHAR(255) UNIQUE,
        "created_at" TIMESTAMPTZ NOT NULL
      );
    `)
    console.log('✅ Created "token_transactions" table if it did not exist.')

    // Create user_subscriptions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_subscriptions" (
        "id" UUID PRIMARY KEY,
        "user_id" UUID UNIQUE NOT NULL,
        "tier" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "stripe_customer_id" TEXT,
        "stripe_subscription_id" TEXT UNIQUE,
        "current_period_start" TIMESTAMPTZ NOT NULL,
        "current_period_end" TIMESTAMPTZ NOT NULL,
        "cancel_at_period_end" BOOLEAN NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL
      );
    `)
    console.log('✅ Created "user_subscriptions" table if it did not exist.')

    console.log('🎉 Missing tables created successfully!')
  } catch (error) {
    console.error('❌ Error creating missing tables:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
