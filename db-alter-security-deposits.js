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

async function run() {
  try {
    console.log('Adding security_deposit_balance to users...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00`);

    console.log('Creating security_deposit_transactions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_deposit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        remarks TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database alteration successful!');
  } catch (err) {
    console.error('Error altering database:', err);
  } finally {
    await pool.end();
  }
}

run();
