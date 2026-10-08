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

async function seedAdvanceBookings() {
  try {
    console.log('Seeding Advance Bookings into database...');

    const sampleBookings = [
      {
        id: `BKG-${Date.now()}-1`,
        user_id: 12, // Ritish Kumar
        vehicle_id: '015',
        plan_id: 2,
        start_time: null,
        pre_booking_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        total_cost: 1500.00, // Payment amount: 1500 -> Due: 5100 - 1500 = 3600
        status: 'pre_booking',
        payment_mode: 'cash',
        payment_status: 'paid',
        due_amount: 3600.00,
        remarks: 'Advance booking deposit paid at hub'
      },
      {
        id: `BKG-${Date.now()}-2`,
        user_id: 14, // Roushan Kumar
        vehicle_id: null,
        plan_id: 2,
        start_time: null,
        pre_booking_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
        total_cost: 2000.00, // Payment amount: 2000 -> Due: 5100 - 2000 = 3100
        status: 'pre_booking',
        payment_mode: 'upi',
        payment_status: 'paid',
        due_amount: 3100.00,
        remarks: 'Pre-booked via UPI app'
      },
      {
        id: `BKG-${Date.now()}-3`,
        user_id: 15, // Gourav Das
        vehicle_id: '014',
        plan_id: 2,
        start_time: null,
        pre_booking_date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
        total_cost: 1000.00, // Payment amount: 1000 -> Due: 5100 - 1000 = 4100
        status: 'pre_booking',
        payment_mode: 'cash',
        payment_status: 'paid',
        due_amount: 4100.00,
        remarks: 'Advance booking for next week'
      },
      {
        id: `BKG-${Date.now()}-4`,
        user_id: 24, // Aditya Kumar
        vehicle_id: '009',
        plan_id: 2,
        start_time: null,
        pre_booking_date: new Date(Date.now() + 86400000 * 1).toISOString(), // Tomorrow
        total_cost: 2500.00, // Payment amount: 2500 -> Due: 5100 - 2500 = 2600
        status: 'pre_booking',
        payment_mode: 'upi',
        payment_status: 'paid',
        due_amount: 2600.00,
        remarks: 'Advance booking for weekend delivery'
      }
    ];

    for (const b of sampleBookings) {
      await pool.query(`
        INSERT INTO rentals (
          id, user_id, vehicle_id, plan_id, start_time, pre_booking_date,
          total_cost, status, payment_mode, payment_status, due_amount, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.user_id, b.vehicle_id, b.plan_id, b.start_time, b.pre_booking_date,
        b.total_cost, b.status, b.payment_mode, b.payment_status, b.due_amount, b.remarks
      ]);
    }

    console.log('Successfully inserted sample Advance Booking records!');
  } catch (err) {
    console.error('Error seeding advance bookings:', err);
  } finally {
    await pool.end();
  }
}

seedAdvanceBookings();
