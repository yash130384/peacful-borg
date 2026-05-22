import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. Database operations will fail.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Neon database requires SSL
  }
});

// Initialize database schema
export async function initDb() {
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

export default pool;
