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

async function wipeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connecting to database...');
    await client.query('BEGIN');
    
    console.log('Wiping out all mock data...');
    // Truncate tables with CASCADE to ignore foreign key constraints during wipe
    await client.query(`
      TRUNCATE TABLE 
        wallet_transactions,
        wallet_approvals,
        account_approvals,
        maintenance_logs,
        rentals,
        wallets,
        vehicles,
        users
      CASCADE;
    `);

    await client.query('COMMIT');
    console.log('Successfully wiped all database tables. You now have a clean slate!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error wiping database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

wipeDatabase();
