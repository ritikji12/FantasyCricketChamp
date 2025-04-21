import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

// Create connection pool
export const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // SSL configuration is needed for managed databases
  },
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Test connection
pool
  .connect()
  .then(() => console.log('✅ Connected to Postgres'))
  .catch((err) => console.error('❌ Postgres connection error:', err));

// Modified test query (removed .all())
async function testQuery() {
  try {
    // Fixed: removed the .all() method
    const result = await db.select().from(schema.players).limit(5);
    console.log("Players:", result);
  } catch (error) {
    console.error("Error with query:", error);
  }
}

// Add the missing selection_percent column if needed
async function addSelectionPercentColumn() {
  try {
    await pool.query(`
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS selection_percent INTEGER DEFAULT 0 NOT NULL
    `);
    console.log("Ensured selection_percent column exists in players table");
  } catch (error) {
    console.error("Error modifying table:", error);
  }
}

// Run the column check and add if needed
addSelectionPercentColumn();

// Run test query afterwards
testQuery();
