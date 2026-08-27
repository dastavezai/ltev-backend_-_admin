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

async function alterDb() {
  const client = await pool.connect();
  try {
    console.log('Starting DB migration for OTP auth and KYC...');
    await client.query('BEGIN');

    // 1. Make email nullable
    await client.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
    console.log('Made email nullable');

    // 2. Add aadhar_image and pan_image columns
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhar_image VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_image VARCHAR(255);');
    console.log('Added KYC image columns');

    // 3. Make phone unique
    // If constraint already exists, this might fail, so we'll do it safely if possible, or just catch it.
    try {
      await client.query('ALTER TABLE users ADD CONSTRAINT unique_phone UNIQUE (phone);');
      console.log('Added unique constraint to phone');
    } catch (e) {
      console.log('Unique constraint might already exist or data conflict:', e.message);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

alterDb();
