const pg = require('pg')
const { Pool } = pg
const pool = new Pool({
  connectionString:
    'postgresql://postgres:309e715d791f68edae9d73d069b3123d04201fa641e9926b@tramway.proxy.rlwy.net:35670/postgres',
})
pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  (err, res) => {
    if (err) {
      console.error(err)
    } else {
      console.log(res.rows.map(r => r.table_name))
    }
    pool.end()
  }
)
