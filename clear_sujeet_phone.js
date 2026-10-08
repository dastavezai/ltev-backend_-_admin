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

async function clearSujeetPhone() {
  try {
    await pool.query(`
      UPDATE users 
      SET phone = '' 
      WHERE name ILIKE '%SUJEET%'
    `);
    console.log('Successfully cleared phone number for Sujeet Kumar / Sujeet Singh!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

clearSujeetPhone();
