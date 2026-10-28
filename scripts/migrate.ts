import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeDB, pool } from '../src/config/db';

/** Runs db/schema.sql against the database configured in .env. */
const migrate = async () => {
  const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema applied');
};

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(closeDB);
