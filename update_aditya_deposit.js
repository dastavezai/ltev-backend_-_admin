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

async function setAdityaDeposit() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find user Aditya Kumar
    const userRes = await client.query("SELECT * FROM users WHERE phone = '6200247854' OR name ILIKE '%Aditya Kumar%'");
    if (userRes.rows.length === 0) {
      throw new Error('User Aditya Kumar not found');
    }

    const user = userRes.rows[0];
    const targetAmt = 3500.00;
    const curBal = parseFloat(user.security_deposit_balance || 0);
    const diff = targetAmt - curBal;
    const remarks = 'Initial Security Deposit Received';

    console.log(`Setting deposit balance for ${user.name} (ID: ${user.id}, Phone: ${user.phone})...`);
    console.log(`Current Balance: ₹${curBal} -> Target Balance: ₹${targetAmt}`);

    // 2. Update users table
    await client.query(
      'UPDATE users SET security_deposit_balance = $1, security_deposit_paid = true WHERE id = $2',
      [targetAmt, user.id]
    );

    // 3. Insert transaction log into security_deposit_transactions
    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, 'deposit', $3, CURRENT_TIMESTAMP)
    `, [user.id, Math.abs(diff) || targetAmt, remarks]);

    // 4. Ensure wallet exists and log to wallet_transactions
    let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user.id]);
    let walletId = null;
    if (walletRes.rows.length === 0) {
      const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [user.id]);
      walletId = newW.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }

    await client.query(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp)
      VALUES ($1, $2, 'credit', $3, 'Security Deposit: ' || $4, 'success', CURRENT_TIMESTAMP)
    `, [`TXN-SET-${Date.now()}`, walletId, Math.abs(diff) || targetAmt, remarks]);

    await client.query('COMMIT');
    console.log(`✓ Successfully updated Aditya Kumar deposit balance to ₹${targetAmt.toFixed(2)} (Paid: true)!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating deposit balance:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

setAdityaDeposit();
