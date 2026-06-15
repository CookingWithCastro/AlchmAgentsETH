import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  console.log('🔗 Connecting to database to add Sacred 7 columns...')

  try {
    await prisma.$connect()
    console.log('✅ Connected. Adding columns...')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "historical_agents"
        ADD COLUMN IF NOT EXISTS "powerScore" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "resonanceScore7" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "wisdomScore" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "charismaScore" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "intuitionScore" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "adaptabilityScore" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "vitalityScore" DOUBLE PRECISION DEFAULT 0;
    `)
    console.log('🎉 Sacred 7 columns added successfully!')
  } catch (error) {
    console.error('❌ Error adding Sacred 7 columns:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
