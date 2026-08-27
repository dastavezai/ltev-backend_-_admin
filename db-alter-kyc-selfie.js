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
    console.log('Starting KYC Selfie DB Alteration...');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS selfie_image VARCHAR(255);
    `);

    console.log('KYC Selfie DB Alteration Complete!');
  } catch (err) {
    console.error('Error altering KYC database for selfie:', err);
  } finally {
    await pool.end();
  }
};

executeAlter();
