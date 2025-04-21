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
async function addSelectionPercentColumn() {
  try {
    await pool.query(`
      ALTER TABLE players 
      ADD COLUMN selection_percent INTEGER DEFAULT 0 NOT NULL
    `);
    console.log("Added selection_percent column to players table");
  } catch (error) {
    console.error("Error adding column:", error);
  }
}

// Call this function to add the column
addSelectionPercentColumn();

async function testQuery() {
  try {
    // Remove the .all() call - it's not needed with drizzle-orm/node-postgres
    const result = await db.select().from(schema.players).limit(5);
    console.log("Players:", result);
  } catch (error) {
    console.error("Error with query:", error);
  }
}

testQuery();
