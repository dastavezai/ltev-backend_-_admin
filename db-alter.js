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
    console.log('Starting Database Alteration...');

    // 1. Add columns (ignore if they already exist)
    console.log('Adding new columns to vehicles table...');
    await pool.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS battery_id VARCHAR(100);
    `);

    // 2. Update existing data with realistic values
    console.log('Updating existing vehicles with sample data...');
    await pool.query(`
      UPDATE vehicles SET 
        chassis_number = 'CH-ATH-2024-99821', 
        registration_number = 'KA-01-EV-4501', 
        battery_id = 'BAT-ATH-99X21'
      WHERE id = 'VH-001';

      UPDATE vehicles SET 
        chassis_number = 'CH-OLA-2024-55412', 
        registration_number = 'KA-03-EV-8822', 
        battery_id = 'BAT-OLA-55P12'
      WHERE id = 'VH-002';

      UPDATE vehicles SET 
        chassis_number = 'CH-TVS-2023-11234', 
        registration_number = 'KA-05-EV-1100', 
        battery_id = 'BAT-TVS-11Q34'
      WHERE id = 'VH-003';

      UPDATE vehicles SET 
        chassis_number = 'CH-ATH-2024-99822', 
        registration_number = 'KA-01-EV-4502', 
        battery_id = 'BAT-ATH-99X22'
      WHERE id = 'VH-004';
    `);

    console.log('Database Alteration Complete!');
  } catch (err) {
    console.error('Error altering database:', err);
  } finally {
    await pool.end();
  }
};

executeAlter();
