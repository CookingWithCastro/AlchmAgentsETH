import pg from 'pg'
import { config } from 'dotenv'

config()

async function main() {
  const { Pool } = pg
  const dbUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  const connectionString = directUrl.startsWith('postgres') ? directUrl : dbUrl

  const pool = new Pool({ connectionString })

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'historical_agents'
      ORDER BY column_name;
    `)
    console.log('Columns in "historical_agents" table:')
    res.rows.forEach(row => {
      console.log(` - ${row.column_name}: ${row.data_type}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

main()
