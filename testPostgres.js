const postgres = require('postgres')

const connectionString = process.env.POSTGRES_DATABASE_URL
const sql = postgres(connectionString)

async function testConnection() {
  try {
    const result = await sql`SELECT 1`;
    // console.log('PostgreSQL connection successful:', result);
  } catch (error) {
    // console.error('PostgreSQL connection failed:', error);
    process.exit(1);
  } finally {
    await sql.end()
  }
}

module.exports = testConnection;
