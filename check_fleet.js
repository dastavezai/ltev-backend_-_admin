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

async function checkFleet() {
  try {
    const vehicles = await pool.query("SELECT id, model, type, status, location, chassis_number, registration_number FROM vehicles ORDER BY id ASC");
    console.log('--- VEHICLES IN DATABASE ---');
    console.log(`Total: ${vehicles.rows.length}`);
    console.log(vehicles.rows);

    const rentals = await pool.query("SELECT r.*, u.name as rider_name FROM rentals r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.id DESC");
    console.log('\n--- RENTALS IN DATABASE ---');
    console.log(`Total: ${rentals.rows.length}`);
    console.log(rentals.rows);

    const plans = await pool.query("SELECT * FROM plans ORDER BY id ASC");
    console.log('\n--- PLANS IN DATABASE ---');
    console.log(plans.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkFleet();
