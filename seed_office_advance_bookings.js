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

const officeData = [
  { name: 'VIKASH KUMAR', phone: '9229174798', paid: 1000, date: '2026-09-21', receipt: '', mode: 'cash' },
  { name: 'RAM SAGAR KUMAR', phone: '8969753806', paid: 500, date: '2026-09-21', receipt: '', mode: 'upi' },
  { name: 'ARVIND KUMAR', phone: '9905649078', paid: 2000, date: '2026-09-28', receipt: '', mode: 'cash' },
  { name: 'SHAKIB KHAN', phone: '7743033295', paid: 2000, date: '2026-09-28', receipt: '', mode: 'upi' },
  { name: 'AMAR KUMAR', phone: '9846837798', paid: 500, date: '2026-09-28', receipt: '', mode: 'cash' },
  { name: 'KAMLESH KUMAR', phone: '9835116694', paid: 2000, date: '2026-09-30', receipt: '', mode: 'upi' },
  { name: 'MANOJ KUMAR', phone: '6299162388', paid: 1800, date: '2026-09-30', receipt: '', mode: 'cash' },
  { name: 'RAJAN KUMAR', phone: '7667679098', paid: 1100, date: '2026-09-30', receipt: '', mode: 'upi' },
  { name: 'ROHIT SATENDRA SINGH', phone: '8210821659', paid: 2000, date: '2026-10-02', receipt: '', mode: 'upi' },
  { name: 'GOVIND KUMAR', phone: '8873325405', paid: 2500, date: '2026-10-03', receipt: '', mode: 'cash' },
  { name: 'PRERM KUMAR', phone: '8320315806', paid: 2000, date: '2026-10-03', receipt: '', mode: 'cash' },
  { name: 'SUJEET KUMAR', phone: '9000000000', paid: 1500, date: '2026-10-03', receipt: '', mode: 'cash' },
  { name: 'ABHIJEET PRATAP SINGH', phone: '7544089615', paid: 2100, date: '2026-10-05', receipt: '9835602315@ybl', mode: 'upi' },
];

async function seedOfficeData() {
  try {
    console.log('Seeding office advance booking records into database...');

    for (let index = 0; index < officeData.length; index++) {
      const item = officeData[index];
      const email = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}${index}@localtoto.in`;
      
      // 1. Upsert User
      let userRes = await pool.query('SELECT id FROM users WHERE phone = $1 OR email = $2', [item.phone, email]);
      let userId;
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        const uIns = await pool.query(`
          INSERT INTO users (name, email, phone, status, role)
          VALUES ($1, $2, $3, 'active', 'customer')
          RETURNING id
        `, [item.name, email, item.phone]);
        userId = uIns.rows[0].id;
      }

      // 2. Insert Rental/Booking Record
      const bkgId = `ADV-BKG-${1000 + index}`;
      const due = Math.max(0, 5100 - item.paid);
      
      await pool.query(`
        INSERT INTO rentals (
          id, user_id, vehicle_id, plan_id, start_time, pre_booking_date,
          total_cost, status, payment_mode, payment_status, due_amount, remarks
        ) VALUES ($1, $2, null, 2, null, $3, $4, 'pre_booking', $5, 'paid', $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          total_cost = EXCLUDED.total_cost,
          pre_booking_date = EXCLUDED.pre_booking_date,
          payment_mode = EXCLUDED.payment_mode,
          due_amount = EXCLUDED.due_amount,
          remarks = EXCLUDED.remarks
      `, [bkgId, userId, item.date, item.paid, item.mode, due, item.receipt || '']);
    }

    console.log('Successfully inserted all 13 Office Advance Booking records!');
  } catch (err) {
    console.error('Error seeding office advance bookings:', err);
  } finally {
    await pool.end();
  }
}

seedOfficeData();
