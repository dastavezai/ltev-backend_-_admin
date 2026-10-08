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

async function checkQuery() {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time, r.end_time, r.next_payment_date, r.pre_booking_date,
        r.total_cost, r.status, r.payment_mode, r.payment_status, r.due_amount, r.remarks,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.email as user_email,
        u.security_deposit_balance, u.security_deposit_paid,
        v.id as vehicle_id, v.model as vehicle_model, v.status as vehicle_status,
        p.id as plan_id, p.name as plan_name, p.price as plan_price, p.type as plan_type
      FROM rentals r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      ORDER BY COALESCE(r.pre_booking_date, r.start_time, NOW()) DESC, r.id DESC
    `);
    console.log(`TOTAL BOOKINGS FETCHED: ${result.rows.length}`);
    console.log(`PRE-BOOKINGS: ${result.rows.filter(r => r.status === 'pre_booking').length}`);
    console.log(result.rows.slice(0, 5));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkQuery();
