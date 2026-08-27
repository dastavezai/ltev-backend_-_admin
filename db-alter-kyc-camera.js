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
    console.log('Starting KYC Camera DB Alteration...');

    await pool.query(`
      ALTER TABLE users 
      RENAME COLUMN aadhar_image TO aadhar_front_image;
    `);

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS aadhar_back_image VARCHAR(255);
    `);

    console.log('KYC DB Alteration Complete!');
  } catch (err) {
    if (err.message.includes('does not exist')) {
       console.log('Column might already be renamed or missing. Proceeding...');
    } else {
       console.error('Error altering KYC database:', err);
    }
  } finally {
    await pool.end();
  }
};

executeAlter();
