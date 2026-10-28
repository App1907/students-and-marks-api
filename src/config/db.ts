import { Pool } from 'pg';
import { env } from './env';

/**
 * One shared connection pool for the whole app. Import `pool` and call
 * `pool.query(sql, params)` - the pool checks out a client and releases it.
 */
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// An idle client erroring (e.g. Postgres restarted) must not crash the process.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/** Verifies the database is reachable. Called once at startup. */
export const connectDB = async (): Promise<void> => {
  await pool.query('SELECT 1');
  console.log(`Connected to PostgreSQL ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
};

export const closeDB = (): Promise<void> => pool.end();
