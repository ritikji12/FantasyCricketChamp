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

// Sample query function to test the connection
async function testQuery() {
  try {
    // Adjust this query to your schema
    const result = await db.select().from(schema.players).limit(5).all();
    console.log("Players:", result);
  } catch (error) {
    console.error("Error with query:", error);
  }
}

testQuery();
