import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const hasDatabaseUrl = !!process.env.DATABASE_URL;

if (!hasDatabaseUrl) {
  console.warn("WARNING: DATABASE_URL is not set. Database operations will fail.");
}

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Neon database requires SSL
      }
    })
  : null;

// Proxy wrapper around pool to throw clear error messages when accessed while pool is null
const poolProxy = new Proxy({}, {
  get(target, prop) {
    if (!pool) {
      throw new Error("DATABASE_URL environment variable is missing. Please configure it in your Vercel Project Settings.");
    }
    const value = pool[prop];
    if (typeof value === 'function') {
      return value.bind(pool);
    }
    return value;
  }
});

// Initialize database schema
export async function initDb() {
  if (!pool) {
    console.warn("Database pool not initialized because DATABASE_URL is missing.");
    return;
  }
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
          filename VARCHAR(255) PRIMARY KEY,
          track_id INTEGER NOT NULL,
          track_name VARCHAR(255) NOT NULL,
          session_type INTEGER NOT NULL,
          session_type_name VARCHAR(255) NOT NULL,
          drivers JSONB NOT NULL,
          alignment_params JSONB,
          status VARCHAR(50) NOT NULL,
          avg_error DOUBLE PRECISION,
          date_string VARCHAR(100),
          size_mb DOUBLE PRECISION,
          telemetry_compressed BYTEA NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized successfully: 'sessions' table checked/created.");
  } catch (err) {
    console.error("Error initializing database schema:", err);
    throw err;
  } finally {
    client.release();
  }
}

export default poolProxy;

