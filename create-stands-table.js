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

async function createStandsTable() {
  const client = await pool.connect();
  try {
    console.log('Connecting to database...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS stands (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 10
      );
    `);

    console.log('Successfully created stands table!');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createStandsTable();
