
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

// Create connection pool
export const pool = new Pool({ connectionString });

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Test connection
pool
  .connect()
  .then(() => console.log('✅ Connected to Postgres'))
  .catch((err) => console.error('❌ Postgres connection error:', err));
