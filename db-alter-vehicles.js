import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const runMigration = async () => {
  try {
    console.log('Running migration...');
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS battery_id VARCHAR(255);
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
};

runMigration();
