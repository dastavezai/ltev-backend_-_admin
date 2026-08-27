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

const executeAlter = async () => {
  try {
    console.log('Starting KYC Database Alteration...');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS cashfree_ref VARCHAR(255);
    `);

    // Update existing users to have a pending status by default, except user 5 who is a pending driver
    await pool.query(`
      UPDATE users SET kyc_status = 'verified' WHERE id IN (1, 2, 4);
      UPDATE users SET kyc_status = 'pending' WHERE id IN (3, 5);
    `);

    console.log('KYC Database Alteration Complete!');
  } catch (err) {
    console.error('Error altering KYC database:', err);
  } finally {
    await pool.end();
  }
};

executeAlter();
