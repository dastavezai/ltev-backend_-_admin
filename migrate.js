import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Adding kyc_status to users...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) NOT NULL DEFAULT 'approved'`);
    
    console.log('Adding security_deposit_paid to users...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_paid BOOLEAN NOT NULL DEFAULT false`);

    console.log('Creating plans table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        security_deposit DECIMAL(10, 2) NOT NULL
      )
    `);

    console.log('Inserting default plans...');
    await pool.query(`
      INSERT INTO plans (name, type, price, security_deposit)
      VALUES 
        ('Daily Pass', 'Daily', 199.00, 500.00),
        ('Weekly Pass', 'Weekly', 999.00, 1000.00),
        ('Monthly Commuter', 'Monthly', 2999.00, 1500.00)
    `);

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
