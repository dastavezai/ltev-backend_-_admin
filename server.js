import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Setup Multer Storage for KYC Images
const uploadDir = path.join(__dirname, 'public', 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Auto-initialize required database tables and columns on startup
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `);
    await pool.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('min_security_deposit', '2000')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_paid BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE rentals ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP`);
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_approvals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        utr VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB-INIT] All tables and settings initialized successfully.');
  } catch (err) {
    console.error('[DB-INIT-ERROR]', err.message);
  }
}
initDatabase();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const accessToken = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret_key_123');
    res.json({ accessToken });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// ==========================================
// MOBILE APP AUTHENTICATION & SMSINDIAHUB OTP
// ==========================================

// Ensure otps table exists
async function initOtpTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false
      );
    `);
  } catch (e) {
    console.error('Error init otps table:', e);
  }
}
initOtpTable();

// SMSIndiaHub OTP Sender Helper (Supports DLT & Cloud Push APIs)
async function sendSmsIndiaHubOtp(phone, otpCode) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const apiKey = process.env.SMSINDIAHUB_API_KEY || '6MhsdTayo0yGMAn5iKwZQQ';
  const senderId = process.env.SMSINDIAHUB_SENDER_ID || process.env.SMSINDIAHUB_SID || 'SCHTRD';
  const brandName = process.env.SMSINDIAHUB_BRAND_NAME || 'LT.ev';
  const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID || '';
  const peId = process.env.SMSINDIAHUB_PE_ID || '';
  const route = process.env.SMSINDIAHUB_ROUTE || '';
  
  let templateText = process.env.SMSINDIAHUB_TEMPLATE_TEXT || 'Dear customer {otp} is your mobile OTP verification code .do not share it with anyone.SCHTRD';
  const message = templateText.replace(/\{otp\}/g, otpCode).replace(/\{brand\}/g, brandName);

  let url;
  if (process.env.SMSINDIAHUB_BASE_URL && process.env.SMSINDIAHUB_BASE_URL.includes('SendSMS')) {
    // DLT SendSMS Endpoint
    const baseUrl = process.env.SMSINDIAHUB_BASE_URL;
    const params = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: 'Trans',
      DCS: '0',
      flashsms: '0',
      number: `91${cleanPhone}`,
      text: message,
      route: route,
      DLTTemplateId: templateId,
      PEId: peId
    });
    url = `${baseUrl}?${params.toString()}`;
  } else {
    // Cloud Vendor PushSMS Endpoint
    const baseUrl = process.env.SMSINDIAHUB_BASE_URL || "https://cloud.smsindiahub.in/vendorsms/pushsms.aspx";
    const msisdn = `91${cleanPhone}`;
    url = `${baseUrl}?APIKey=${encodeURIComponent(apiKey)}&msisdn=${encodeURIComponent(msisdn)}&sid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(message)}&fl=0&gwid=2`;
  }

  console.log(`[SMSINDIAHUB] Dispatching OTP to 91${cleanPhone}`);

  try {
    const response = await fetch(url);
    const textResponse = await response.text();
    console.log(`[SMSINDIAHUB] Gateway Response:`, textResponse);
    return { success: true, response: textResponse };
  } catch (error) {
    console.error(`[SMSINDIAHUB ERROR]:`, error);
    return { success: false, error: error.message };
  }
}

// 1. Send Real OTP via SMSIndiaHub
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    // Generate random 6-digit OTP (matching SMSIndiaHub DLT Template)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database with 5-minute expiry
    await pool.query(`
      INSERT INTO otps (phone, otp, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 minutes')
    `, [cleanPhone, otpCode]);

    console.log(`[OTP GENERATED] Phone: ${cleanPhone} | Code: ${otpCode} (Valid for 5 mins)`);

    // Send via SMSIndiaHub Gateway
    const smsResult = await sendSmsIndiaHubOtp(cleanPhone, otpCode);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully to your mobile number',
      provider: 'SMSIndiaHub',
      phone: cleanPhone,
      devOtp: otpCode
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. User Registration via OTP
app.post('/api/auth/verify-register', async (req, res) => {
  try {
    const { name, phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const otpStr = otp.toString().trim();

    let isValid = false;

    // Verify against DB-stored OTP
    const otpRes = await pool.query(`
      SELECT * FROM otps 
      WHERE phone = $1 AND otp = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `, [cleanPhone, otpStr]);

    if (otpRes.rows.length > 0) {
      isValid = true;
      await pool.query('UPDATE otps SET is_used = true WHERE id = $1', [otpRes.rows[0].id]);
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }
    
    // Check if user exists
    const existing = await pool.query('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists. Please login instead.' });
    }

    const result = await pool.query(
      "INSERT INTO users (name, phone, role, status, kyc_status) VALUES ($1, $2, 'driver', 'pending', 'pending') RETURNING id, name, phone, role, status, kyc_status",
      [name || 'Driver', cleanPhone]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_key_123');
    
    res.json({ token, user });
  } catch (err) {
    console.error('Verify register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. User Login via OTP
app.post('/api/auth/verify-login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const otpStr = otp.toString().trim();

    let isValid = false;

    // Verify against DB-stored OTP
    const otpRes = await pool.query(`
      SELECT * FROM otps 
      WHERE phone = $1 AND otp = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `, [cleanPhone, otpStr]);

    if (otpRes.rows.length > 0) {
      isValid = true;
      await pool.query('UPDATE otps SET is_used = true WHERE id = $1', [otpRes.rows[0].id]);
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }
    
    const result = await pool.query('SELECT id, name, phone, email, role, status, kyc_status, security_deposit_balance FROM users WHERE phone = $1', [cleanPhone]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found. Please sign up.' });
    }

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_key_123');
    
    res.json({ token, user });
  } catch (err) {
    console.error('Verify login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit KYC
app.post('/api/kyc/upload', authenticateToken, upload.any(), async (req, res) => {
  try {
    const userId = req.user.id;
    let aadhar_front_url = null;
    let aadhar_back_url = null;
    let pan_image_url = null;
    let selfie_image_url = null;
    
    // upload.any() returns an array: req.files = [{ fieldname: 'aadhar_front', ... }, ...]
    const getFile = (fieldname) => req.files && req.files.find(f => f.fieldname === fieldname);

    const aadharFrontFile = getFile('aadhar_front');
    if (aadharFrontFile) {
      aadhar_front_url = `/uploads/kyc/${aadharFrontFile.filename}`;
    } else {
      aadhar_front_url = req.body.aadhar_front;
    }
    
    const aadharBackFile = getFile('aadhar_back');
    if (aadharBackFile) {
      aadhar_back_url = `/uploads/kyc/${aadharBackFile.filename}`;
    } else {
      aadhar_back_url = req.body.aadhar_back;
    }
    
    const panImageFile = getFile('pan_image');
    if (panImageFile) {
      pan_image_url = `/uploads/kyc/${panImageFile.filename}`;
    } else {
      pan_image_url = req.body.pan_image;
    }
    
    const selfieImageFile = getFile('selfie_image');
    if (selfieImageFile) {
      selfie_image_url = `/uploads/kyc/${selfieImageFile.filename}`;
    } else {
      selfie_image_url = req.body.selfie_image;
    }

    if (!aadhar_front_url || !aadhar_back_url || !pan_image_url || !selfie_image_url) {
      return res.status(400).json({ error: 'Aadhaar front, Aadhaar back, PAN, and Selfie images are required' });
    }

    const result = await pool.query(`
      UPDATE users 
      SET aadhar_front_image = $1, aadhar_back_image = $2, pan_image = $3, selfie_image = $4, kyc_status = 'completed'
      WHERE id = $5 RETURNING id, name, kyc_status
    `, [aadhar_front_url, aadhar_back_url, pan_image_url, selfie_image_url, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.kyc_status, u.security_deposit_paid, u.security_deposit_balance, COALESCE(w.balance, 0) as wallet_balance
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vehicles API
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id, v.model, v.type, v.status, v.location,
        v.chassis_number, v.registration_number,
        u.name as renter
      FROM vehicles v
      LEFT JOIN rentals r ON r.vehicle_id = v.id AND r.status = 'active'
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY v.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Vehicle
app.post('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const { model, type, status, location, chassis_number, registration_number } = req.body;
    
    // Use registration number as the unique ID
    const id = registration_number;

    const result = await pool.query(`
      INSERT INTO vehicles (id, model, type, status, location, chassis_number, registration_number) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [id, model, type, status, location, chassis_number, registration_number]);
    
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vehicle Details Deep API
app.get('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get base vehicle info
    const vehicleRes = await pool.query(`
      SELECT 
        v.*,
        u.name as current_renter, u.id as current_renter_id,
        r.start_time as current_rental_start
      FROM vehicles v
      LEFT JOIN rentals r ON r.vehicle_id = v.id AND r.status = 'active'
      LEFT JOIN users u ON u.id = r.user_id
      WHERE v.id = $1
    `, [id]);

    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const vehicle = vehicleRes.rows[0];

    // 2. Get Rental History
    const historyRes = await pool.query(`
      SELECT 
        r.id, r.start_time, r.end_time, r.total_cost, r.status,
        u.name as user_name
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      WHERE r.vehicle_id = $1
      ORDER BY r.start_time DESC
    `, [id]);

    // 3. Get Maintenance Logs
    const maintenanceRes = await pool.query(`
      SELECT * FROM maintenance_logs
      WHERE vehicle_id = $1
      ORDER BY date_reported DESC
    `, [id]);

    res.json({
      ...vehicle,
      rental_history: historyRes.rows,
      maintenance_logs: maintenanceRes.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Vehicle
app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { model, type, status, location, chassis_number } = req.body;
    
    // Note: registration_number (id) cannot be changed
    const result = await pool.query(`
      UPDATE vehicles 
      SET model = $1, type = $2, status = $3, location = $4, chassis_number = $5
      WHERE id = $6 RETURNING *
    `, [model, type, status, location, chassis_number, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Vehicle
app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    
    // 1. Delete associated maintenance logs
    await client.query('DELETE FROM maintenance_logs WHERE vehicle_id = $1', [id]);
    
    // 2. Delete associated rentals
    await client.query('DELETE FROM rentals WHERE vehicle_id = $1', [id]);
    
    // 3. Delete the vehicle
    const result = await client.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
    
    await client.query('COMMIT');
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Users API (Join with wallets)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.status, u.role, u.joined_date, u.kyc_status,
        COALESCE(w.balance, 0) as wallet_balance
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.id ASC
    `);
    // Format dates for UI
    const formatted = result.rows.map(r => ({
      ...r,
      id: `USR-${String(r.id).padStart(3, '0')}`,
      joined: new Date(r.joined_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create User (Admin Action)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;

    await pool.query('BEGIN');
    
    const result = await pool.query(
      "INSERT INTO users (name, email, phone, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, email, phone, role || 'customer', status || 'active']
    );
    
    const newUserId = result.rows[0].id;
    
    // Create an empty wallet for the user automatically
    await pool.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 0)", [newUserId]);
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Update User (Admin Action)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    let { id } = req.params;
    // Remove "USR-" prefix if present from UI
    if (id.startsWith('USR-')) {
      id = parseInt(id.replace('USR-', ''), 10);
    }
    const { name, email, phone, role, status, kyc_status } = req.body;
    
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, phone = $3, role = $4, status = $5, kyc_status = $6 WHERE id = $7 RETURNING *",
      [name, email, phone, role, status, kyc_status, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Security Deposits API
app.get('/api/security-deposits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, phone, security_deposit_balance
      FROM users
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/security-deposits/:userId/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT id, amount, type, remarks, date
      FROM security_deposit_transactions
      WHERE user_id = $1
      ORDER BY date DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/security-deposits/deduct', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    
    if (!user_id || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid user ID and amount are required.' });
    }

    await client.query('BEGIN');
    
    const userRes = await client.query('SELECT security_deposit_balance FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) throw new Error('User not found');
    const balance = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    
    if (balance < amount) {
      throw new Error(`Insufficient security deposit balance. Maximum deductible is ₹${balance}`);
    }

    const newBal = balance - parseFloat(amount);
    const isPaid = newBal >= 2000;
    await client.query('UPDATE users SET security_deposit_balance = $1, security_deposit_paid = $2 WHERE id = $3', [newBal, isPaid, user_id]);
    
    const deductionRemarks = remarks ? `Security Deposit Deduction: ${remarks}` : 'Security Deposit Deduction by Admin';

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, 'deduction', $3, CURRENT_TIMESTAMP)
    `, [user_id, amount, deductionRemarks]);

    // Ensure wallet exists and log to wallet_transactions so it displays in user recent transactions
    let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
    let walletId = null;
    if (walletRes.rows.length === 0) {
      const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [user_id]);
      walletId = newW.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }

    await client.query(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp)
      VALUES ($1, $2, 'debit', $3, $4, 'success', CURRENT_TIMESTAMP)
    `, [`TXN-DED-${Date.now()}`, walletId, amount, deductionRemarks]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Deduction successful and recorded in user transactions.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/security-deposits/add', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    
    if (!user_id || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid user ID and amount are required.' });
    }

    await client.query('BEGIN');
    
    const userRes = await client.query('SELECT security_deposit_balance FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) throw new Error('User not found');
    const balance = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    const newBal = balance + parseFloat(amount);
    const isPaid = newBal >= 2000;

    await client.query('UPDATE users SET security_deposit_balance = $1, security_deposit_paid = $2 WHERE id = $3', [newBal, isPaid, user_id]);
    
    const addRemarks = remarks ? `Security Deposit Added: ${remarks}` : 'Security Deposit Added by Admin';

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, 'deposit', $3, CURRENT_TIMESTAMP)
    `, [user_id, amount, addRemarks]);

    // Ensure wallet exists and log to wallet_transactions
    let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
    let walletId = null;
    if (walletRes.rows.length === 0) {
      const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [user_id]);
      walletId = newW.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }

    await client.query(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp)
      VALUES ($1, $2, 'credit', $3, $4, 'success', CURRENT_TIMESTAMP)
    `, [`TXN-DEP-${Date.now()}`, walletId, amount, addRemarks]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Deposit addition successful and recorded in user transactions.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/security-deposits/set', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    const targetAmt = parseFloat(amount || 0);

    await client.query('BEGIN');
    const userRes = await client.query('SELECT security_deposit_balance FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) throw new Error('User not found');
    const curBal = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    const diff = targetAmt - curBal;
    const isPaid = targetAmt >= 2000;

    await client.query('UPDATE users SET security_deposit_balance = $1, security_deposit_paid = $2 WHERE id = $3', [targetAmt, isPaid, user_id]);

    const setRemarks = remarks || `Security Deposit Updated to ₹${targetAmt}`;

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [user_id, Math.abs(diff) || targetAmt, diff >= 0 ? 'deposit' : 'deduction', setRemarks]);

    // Log to wallet transactions
    let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
    let walletId = null;
    if (walletRes.rows.length === 0) {
      const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [user_id]);
      walletId = newW.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }

    await client.query(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp)
      VALUES ($1, $2, $3, $4, $5, 'success', CURRENT_TIMESTAMP)
    `, [`TXN-SET-${Date.now()}`, walletId, Math.abs(diff) || targetAmt, diff >= 0 ? 'credit' : 'debit', setRemarks]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Deposit set successfully and recorded in user transactions.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Transactions API (wallet_transactions joined with users)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wt.id, wt.type, wt.amount, wt.description as desc, wt.status, wt.timestamp,
        u.name as user
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      JOIN users u ON u.id = w.user_id
      ORDER BY wt.timestamp DESC
    `);
    const formatted = result.rows.map(r => ({
      ...r,
      date: new Date(r.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' }),
      time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Cash Payment API
app.post('/api/transactions/cash', authenticateToken, async (req, res) => {
  try {
    const { user_id, amount, reference } = req.body;
    
    // Ensure amount is valid
    if (!user_id || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid user ID and amount are required.' });
    }

    await pool.query('BEGIN');
    
    // Get wallet for user
    const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
    
    if (walletRes.rows.length === 0) {
      // Create wallet if it doesn't exist
      const newWallet = await pool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2) RETURNING id', [user_id, amount]);
      const newWalletId = newWallet.rows[0].id;
      
      await pool.query(`
        INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_id, status) 
        VALUES ($1, $2, 'credit', $3, 'Cash Payment at Office', $4, 'success')
      `, [`TXN-CASH-${Date.now()}`, newWalletId, amount, reference || 'N/A']);
    } else {
      const walletId = walletRes.rows[0].id;
      
      // Update existing wallet
      await pool.query('UPDATE wallets SET balance = balance + $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2', [amount, walletId]);
      
      await pool.query(`
        INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_id, status) 
        VALUES ($1, $2, 'credit', $3, 'Cash Payment at Office', $4, 'success')
      `, [`TXN-CASH-${Date.now()}`, walletId, amount, reference || 'N/A']);
    }
    
    await pool.query('COMMIT');
    res.json({ success: true, message: 'Cash payment processed successfully.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Rentals API

// Purchase Plan & Request EV Assignment
app.post('/api/plans/purchase', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { plan_id, deposit_to_pay, deposit_paid } = req.body;
    const user_id = req.user.id;
    const depositAmt = parseFloat(deposit_to_pay !== undefined ? deposit_to_pay : (deposit_paid || 0));

    await client.query('BEGIN');
    
    // Get plan details
    const planRes = await client.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plan not found.' });
    }
    const plan = planRes.rows[0];
    const planPrice = parseFloat(plan.price || 0);
    const rentalId = `RNT-${Date.now().toString().slice(-6)}`;
    
    // Insert pending rental
    await client.query(
      'INSERT INTO rentals (id, user_id, plan_id, total_cost, status) VALUES ($1, $2, $3, $4, $5)',
      [rentalId, user_id, plan_id, plan.price, 'pending_assignment']
    );
    
    // 1. Update security deposit if any was paid during checkout
    if (depositAmt > 0) {
      const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
      const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

      const userRes = await client.query('SELECT security_deposit_balance FROM users WHERE id = $1', [user_id]);
      const curBal = parseFloat(userRes.rows[0]?.security_deposit_balance || 0);
      const newBal = curBal + depositAmt;
      const isPaid = newBal >= minDeposit;

      await client.query('UPDATE users SET security_deposit_balance = $1, security_deposit_paid = $2 WHERE id = $3', [newBal, isPaid, user_id]);
      
      await client.query(`
        INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
        VALUES ($1, $2, 'deposit', $3, CURRENT_TIMESTAMP)
      `, [user_id, depositAmt, `Security Deposit for ${plan.name} (${rentalId})`]);
    }

    // 2. Also log plan payment to wallet/platform transactions so Transactions page shows it
    let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
    let walletId = null;
    if (walletRes.rows.length === 0) {
      const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [user_id]);
      walletId = newW.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }

    const totalPaid = planPrice + depositAmt;
    await client.query(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_id, status, timestamp)
      VALUES ($1, $2, 'credit', $3, $4, $5, 'success', CURRENT_TIMESTAMP)
    `, [`TXN-ORD-${Date.now()}`, walletId, totalPaid, `Plan Booking: ${plan.name} ${depositAmt > 0 ? `(₹${planPrice} + ₹${depositAmt} Deposit)` : ''}`, rentalId]);

    // 3. Create a pending payment approval request in wallet_approvals for Admin verification
    const utrText = `PLAN_BOOKING: ${plan.name} (${rentalId}) ${depositAmt > 0 ? `[Plan ₹${planPrice} + Deposit ₹${depositAmt}]` : `[Plan ₹${planPrice}]`}`;
    await client.query(`
      INSERT INTO wallet_approvals (user_id, amount, utr, status, date)
      VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
    `, [user_id, totalPaid, utrText]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Plan purchased successfully. Pending EV assignment & admin verification.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error purchasing plan:', err);
    res.status(500).json({ error: 'Failed to process purchase.' });
  } finally {
    client.release();
  }
});

// Get pending rental requests for Admin
app.get('/api/rentals/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.total_cost as cost, r.status, u.name as user_name, u.phone as user_phone, p.name as plan_name, p.type as plan_type
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      JOIN plans p ON p.id = r.plan_id
      WHERE r.status = 'pending_assignment'
      ORDER BY r.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin assign EV to rental
app.put('/api/rentals/:id/assign', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body;

    await client.query('BEGIN');

    // 1. Check vehicle
    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1 AND status = $2', [vehicle_id, 'available']);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vehicle is not available.' });
    }

    // 2. Update rental
    const rentalRes = await client.query(
      'UPDATE rentals SET vehicle_id = $1, start_time = NOW(), status = $2 WHERE id = $3 RETURNING *',
      [vehicle_id, 'active', id]
    );
    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental request not found.' });
    }

    // 3. Update vehicle status
    await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['in_use', vehicle_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'EV Assigned Successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Admin Cancel / Reject Rental Request
app.post('/api/rentals/:id/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const rentalRes = await client.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental request not found' });
    }

    const rental = rentalRes.rows[0];

    // If vehicle was already linked, make it available again
    if (rental.vehicle_id) {
      await client.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [rental.vehicle_id]);
    }

    // Mark rental as cancelled
    await client.query("UPDATE rentals SET status = 'cancelled' WHERE id = $1", [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Rental request has been cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get EV Return Requests for Admin
app.get('/api/rentals/return-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time, r.total_cost as cost, r.status, r.vehicle_id,
        u.name as user_name, u.phone as user_phone,
        v.model as vehicle_model,
        p.name as plan_name, p.type as plan_type
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.status = 'pending_return'
      ORDER BY r.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Confirm EV Return / EV Submission Received
app.post('/api/rentals/:id/confirm-return', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const rentalRes = await client.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental record not found.' });
    }

    const rental = rentalRes.rows[0];

    // 1. Mark vehicle as available
    if (rental.vehicle_id) {
      await client.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [rental.vehicle_id]);
    }

    // 2. Mark rental as completed
    await client.query(
      "UPDATE rentals SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'EV return confirmed! Vehicle is now available for new bookings.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Helper function: Automatically deduct rental due from wallet if due date has passed
async function autoDeductRentalDueFromWallet(userId) {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE rentals ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP');
    await client.query('BEGIN');

    // 1. Fetch active rental for user
    const rentalRes = await client.query(`
      SELECT r.*, p.price as plan_price, p.type as plan_type, p.name as plan_name
      FROM rentals r
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.user_id = $1 AND r.status = 'active'
      ORDER BY r.start_time DESC LIMIT 1
    `, [userId]);

    if (rentalRes.rows.length === 0) {
      await client.query('COMMIT');
      return { deducted: 0 };
    }

    const rental = rentalRes.rows[0];
    const price = parseFloat(rental.plan_price || 0);
    if (price <= 0) {
      await client.query('COMMIT');
      return { deducted: 0 };
    }

    const planType = (rental.plan_type || '').toLowerCase();
    let cycleMs = 24 * 60 * 60 * 1000; // 24 hours
    if (planType.includes('weekly')) {
      cycleMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (planType.includes('monthly')) {
      cycleMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    const start = new Date(rental.start_time || new Date());
    let nextDue = rental.next_payment_date ? new Date(rental.next_payment_date) : new Date(start.getTime() + cycleMs);
    const now = new Date();

    // If current time hasn't passed nextDue, not due yet
    if (now <= nextDue) {
      await client.query('COMMIT');
      return { deducted: 0, nextDue };
    }

    // Calculate overdue cycles
    const diffMs = now.getTime() - nextDue.getTime();
    const overdueCycles = Math.floor(diffMs / cycleMs) + 1;

    // 2. Fetch user's wallet
    let walletRes = await client.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (walletRes.rows.length === 0) {
      walletRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *', [userId]);
    }

    const wallet = walletRes.rows[0];
    const currentBalance = parseFloat(wallet.balance || 0);

    if (currentBalance >= price) {
      // How many overdue cycles can the wallet balance cover?
      const cyclesToPay = Math.min(overdueCycles, Math.floor(currentBalance / price));

      if (cyclesToPay > 0) {
        const amountToDeduct = cyclesToPay * price;
        const newBalance = currentBalance - amountToDeduct;
        const newNextDue = new Date(nextDue.getTime() + (cyclesToPay * cycleMs));

        // Deduct from wallet
        await client.query('UPDATE wallets SET balance = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2', [newBalance, wallet.id]);

        // Record in wallet_transactions
        const txnId = `TXN-AUTO-${Date.now()}`;
        await client.query(`
          INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp)
          VALUES ($1, $2, 'debit', $3, $4, 'success', CURRENT_TIMESTAMP)
        `, [txnId, wallet.id, amountToDeduct, `Auto-deducted ${rental.plan_name || 'Rental'} Due (${cyclesToPay} cycle)`]);

        // Update rental next_payment_date and total_cost
        await client.query(`
          UPDATE rentals 
          SET total_cost = COALESCE(total_cost, 0) + $1, next_payment_date = $2
          WHERE id = $3
        `, [amountToDeduct, newNextDue.toISOString(), rental.id]);

        await client.query('COMMIT');
        console.log(`[AUTO-DEDUCT] Deducted ₹${amountToDeduct} from user ${userId}'s wallet for rental ${rental.id}`);
        return { deducted: amountToDeduct, newBalance, nextDue: newNextDue };
      }
    }

    await client.query('COMMIT');
    return { deducted: 0, nextDue };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in autoDeductRentalDueFromWallet:', err);
    return { error: err.message };
  } finally {
    client.release();
  }
}

// Periodic Worker to auto-deduct dues for all active rentals
setInterval(async () => {
  try {
    const activeRentals = await pool.query("SELECT DISTINCT user_id FROM rentals WHERE status = 'active'");
    for (const row of activeRentals.rows) {
      await autoDeductRentalDueFromWallet(row.user_id);
    }
  } catch (err) {
    console.error('[Periodic-Worker-Error]', err);
  }
}, 60 * 60 * 1000); // Run every hour

// Get active rental for current user
app.get('/api/rentals/active', authenticateToken, async (req, res) => {
  try {
    // 1. Auto-deduct any pending due from wallet if balance is available
    await autoDeductRentalDueFromWallet(req.user.id);

    const result = await pool.query(`
      SELECT r.*, v.model as vehicle_model, v.id as vehicle_registration, p.price as plan_price, p.name as plan_name, p.type as plan_type
      FROM rentals r
      JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.user_id = $1 AND r.status = 'active'
      ORDER BY r.start_time DESC LIMIT 1
    `, [req.user.id]);
    
    if (result.rows.length > 0) {
      const rental = result.rows[0];
      let next_payment_date = null;
      let due_amount = 0;
      let overdue_days = 0;
      let is_overdue = false;

      if (rental.start_time && rental.plan_type) {
        const start = new Date(rental.start_time);
        const type = rental.plan_type.toLowerCase();
        const price = parseFloat(rental.plan_price || 0);
        const now = new Date();

        let cycleMs = 24 * 60 * 60 * 1000;
        let cycleDays = 1;
        if (type.includes('weekly')) {
          cycleMs = 7 * 24 * 60 * 60 * 1000;
          cycleDays = 7;
        } else if (type.includes('monthly')) {
          cycleMs = 30 * 24 * 60 * 60 * 1000;
          cycleDays = 30;
        }

        const nextDue = rental.next_payment_date ? new Date(rental.next_payment_date) : new Date(start.getTime() + cycleMs);
        next_payment_date = nextDue.toISOString();

        if (now > nextDue) {
          const diffMs = now.getTime() - nextDue.getTime();
          const overdueCycles = Math.floor(diffMs / cycleMs) + 1;
          overdue_days = overdueCycles * cycleDays;
          due_amount = overdueCycles * price;
          is_overdue = true;
        }
      }
      res.json({ ...rental, next_payment_date, due_amount, overdue_days, is_overdue });
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay rental due amount
app.post('/api/rentals/pay-due', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, days_paid } = req.body;
    const user_id = req.user.id;

    await client.query('BEGIN');

    const rentalRes = await client.query(`
      SELECT r.*, p.price as plan_price, p.type as plan_type
      FROM rentals r
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.user_id = $1 AND r.status = 'active'
      ORDER BY r.start_time DESC LIMIT 1
    `, [user_id]);

    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active rental found.' });
    }

    const rental = rentalRes.rows[0];
    const paidAmount = parseFloat(amount || 0);

    // Update rental total_cost
    await client.query(
      'UPDATE rentals SET total_cost = COALESCE(total_cost, 0) + $1 WHERE id = $2',
      [paidAmount, rental.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Due payment recorded successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get rental history for current user
app.get('/api/rentals/my-history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time, r.end_time, r.total_cost, r.status,
        v.id as vehicle_id, v.model as vehicle_model,
        p.name as plan_name, p.price as plan_price, p.type as plan_type
      FROM rentals r
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.user_id = $1
      ORDER BY COALESCE(r.start_time, NOW()) DESC, r.id DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a Rental
app.post('/api/rentals/start', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { vehicle_id } = req.body;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // 1. Check if vehicle is available
    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1 AND status = $2', [vehicle_id, 'available']);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vehicle is not available for rent.' });
    }

    // 2. Create Rental
    const rentalId = `RNT-${Date.now().toString().slice(-6)}`;
    const result = await client.query(`
      INSERT INTO rentals (id, user_id, vehicle_id, start_time, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'active') RETURNING *
    `, [rentalId, user_id, vehicle_id]);

    // 3. Update Vehicle Status
    await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['in_use', vehicle_id]);

    await client.query('COMMIT');
    
    // Fetch full vehicle info to return to mobile
    const assignedVehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    
    res.json({ success: true, rental: result.rows[0], vehicle: assignedVehicle.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all pending rental requests (for assignment and returns in admin panel)
app.get('/api/rentals/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time, r.end_time, r.total_cost as cost, r.status,
        u.id as user_id, u.name as user_name, u.phone as user_phone,
        v.id as vehicle_id, v.model as vehicle_model,
        p.name as plan_name, p.price as plan_price, p.type as plan_type
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.status IN ('pending_assignment', 'pending_return')
      ORDER BY COALESCE(r.end_time, r.start_time, NOW()) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin assign vehicle to pending rental request
app.put('/api/rentals/:id/assign', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body;

    await client.query('BEGIN');

    // 1. Check vehicle availability
    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0 || vehicleRes.rows[0].status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected vehicle is not available.' });
    }

    // 2. Assign vehicle and activate rental
    const updateRental = await client.query(`
      UPDATE rentals 
      SET vehicle_id = $1, start_time = CURRENT_TIMESTAMP, status = 'active'
      WHERE id = $2
      RETURNING *
    `, [vehicle_id, id]);

    if (updateRental.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental request not found.' });
    }

    // 3. Mark vehicle as in_use
    await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['in_use', vehicle_id]);

    await client.query('COMMIT');
    res.json({ success: true, rental: updateRental.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all rentals for admin panel
app.get('/api/rentals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time as "startTime", r.end_time as "endTime", 
        COALESCE(r.total_cost, p.price, 0) as "rentCollected",
        r.status,
        u.name as user, u.phone as user_phone,
        COALESCE(v.model, 'EV') || ' (' || COALESCE(v.id, 'N/A') || ')' as vehicle,
        p.name as plan_name,
        COALESCE(u.wallet_balance, 0) as deposit
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      ORDER BY COALESCE(r.start_time, NOW()) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End a Rental
app.post('/api/rentals/end', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { stand_id } = req.body;

    await client.query('BEGIN');

    // 1. Get Rental and calculate cost
    const rentalRes = await client.query('SELECT * FROM rentals WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Active rental not found.' });
    }
    const rental = rentalRes.rows[0];
    const rental_id = rental.id;

    // Dummy cost calculation (e.g., 50 rupees)
    const cost = 50.00;

    // 2. Mark Rental as Pending Return
    const result = await client.query(`
      UPDATE rentals 
      SET end_time = CURRENT_TIMESTAMP, status = 'pending_return', total_cost = $1
      WHERE id = $2 RETURNING *
    `, [cost, rental_id]);

    // 3. Update Vehicle Status
    await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['pending_return', rental.vehicle_id]);

    await client.query('COMMIT');
    res.json({ success: true, rental: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Admin approve vehicle return
app.post('/api/rentals/:id/approve-return', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const rentalRes = await client.query('SELECT * FROM rentals WHERE id = $1 AND status = $2', [id, 'pending_return']);
    if (rentalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found or not pending return.' });
    }
    const rental = rentalRes.rows[0];

    // Update rental
    await client.query('UPDATE rentals SET status = $1 WHERE id = $2', ['completed', id]);

    // Update vehicle status
    await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['available', rental.vehicle_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Return approved and vehicle is now available.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Unified Updates Feed
app.get('/api/updates', authenticateToken, async (req, res) => {
  try {
    const updates = [];

    // 1. Fetch pending returns
    const rentalsRes = await pool.query(`
      SELECT r.id, r.end_time as date, 'Vehicle Return' as title, 
             'User ' || u.name || ' wants to return ' || COALESCE(v.model, 'EV') as description, 
             'return' as type, r.status
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.status = 'pending_return'
    `);
    updates.push(...rentalsRes.rows);

    // 2. Fetch pending KYC
    const kycRes = await pool.query(`
      SELECT id::text, date, 'KYC Approval' as title, 
             'User ' || user_name || ' submitted ' || document_type as description, 
             'kyc' as type, status
      FROM account_approvals
      WHERE status = 'pending'
    `);
    updates.push(...kycRes.rows);

    // 3. Fetch pending wallet approvals
    const walletRes = await pool.query(`
      SELECT id::text, date, 'Wallet Deposit' as title, 
             'User ' || user_name || ' deposited ₹' || amount as description, 
             'wallet' as type, status
      FROM wallet_approvals
      WHERE status = 'pending'
    `);
    updates.push(...walletRes.rows);

    // Sort all updates by date descending
    updates.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rentals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, r.start_time, r.end_time, r.total_cost, r.status, r.next_payment_date,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.email as user_email,
        u.security_deposit_balance, u.security_deposit_paid,
        v.id as vehicle_id, v.model as vehicle_model, v.type as vehicle_type, v.battery as vehicle_battery,
        p.name as plan_name, p.type as plan_type, p.price as plan_price
      FROM rentals r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      ORDER BY r.id DESC
    `);
    
    const formatted = result.rows.map(r => {
      const start = r.start_time ? new Date(r.start_time) : null;
      const end = r.end_time ? new Date(r.end_time) : null;
      
      let durationText = 'N/A';
      if (start) {
        const endRef = end || new Date();
        const diffHours = Math.max(1, Math.round((endRef - start) / (1000 * 60 * 60)));
        if (diffHours < 24) {
          durationText = `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'}`;
        } else {
          const days = Math.floor(diffHours / 24);
          const remHours = diffHours % 24;
          durationText = `${days}d ${remHours > 0 ? `${remHours}h` : ''}`.trim();
        }
      }

      return {
        id: r.id,
        user_name: r.user_name || 'Anonymous Rider',
        user_phone: r.user_phone || 'N/A',
        user_email: r.user_email || 'N/A',
        vehicle_id: r.vehicle_id || null,
        vehicle_model: r.vehicle_model || (r.vehicle_id ? 'LT.ev Scooter' : 'Pending EV Assignment'),
        vehicle_battery: r.vehicle_battery !== undefined ? r.vehicle_battery : null,
        plan_name: r.plan_name || 'Standard Rental',
        plan_type: r.plan_type || 'Custom',
        startTime: start ? start.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata' }) : 'Awaiting Assignment',
        endTime: end ? end.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata' }) : (r.status === 'active' ? 'Currently In-Use' : r.status === 'pending_return' ? 'Return Requested' : 'N/A'),
        duration: durationText,
        next_payment_date: r.next_payment_date ? new Date(r.next_payment_date).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata' }) : null,
        rentCollected: r.total_cost || r.plan_price ? `₹${parseFloat(r.total_cost || r.plan_price || 0).toLocaleString('en-IN')}` : '₹0',
        deposit: r.security_deposit_paid || (parseFloat(r.security_deposit_balance || 0) >= 2000) ? `₹${parseFloat(r.security_deposit_balance || 2000).toLocaleString('en-IN')} (Paid)` : 'Pending',
        status: r.status || 'pending_assignment'
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch rentals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Account Approvals API
app.get('/api/account_approvals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, a.document_type, a.document_number, a.status, a.date,
        u.name as user, u.phone as phone
      FROM account_approvals a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.date DESC
    `);
    const formatted = result.rows.map(r => ({
      id: r.id,
      user: r.user,
      phone: r.phone,
      docs: [r.document_type], // UI expects array
      status: r.status,
      date: new Date(r.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/account_approvals/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE account_approvals SET status = $1 WHERE id = $2', ['approved', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/account_approvals/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE account_approvals SET status = $1 WHERE id = $2', ['rejected', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wallet Approvals API
app.get('/api/wallet_approvals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        w.id, w.amount, w.utr, w.status, w.date,
        u.name as user, u.phone
      FROM wallet_approvals w
      JOIN users u ON u.id = w.user_id
      ORDER BY w.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet_approvals/:id/approve', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    
    const approvalRes = await client.query('SELECT * FROM wallet_approvals WHERE id = $1', [id]);
    if (approvalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const appReq = approvalRes.rows[0];
    const user_id = appReq.user_id;
    const amount = parseFloat(appReq.amount);
    const utr = appReq.utr || '';

    // 1. Check if this is a Plan Booking Payment
    if (utr.includes('PLAN_BOOKING') || utr.includes('PLAN_PAYMENT')) {
      await client.query("UPDATE wallet_approvals SET status = 'success' WHERE id = $1", [id]);

      // If deposit was included in the booking UTR, ensure security deposit is updated
      if (utr.includes('Deposit')) {
        const depMatch = utr.match(/Deposit ₹?(\d+)/i);
        const depPaid = depMatch ? parseFloat(depMatch[1]) : 0;
        if (depPaid > 0) {
          const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
          const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

          const userRes = await client.query('SELECT security_deposit_balance FROM users WHERE id = $1', [user_id]);
          const curBal = parseFloat(userRes.rows[0]?.security_deposit_balance || 0);
          const newBal = curBal + depPaid;
          const isPaid = newBal >= minDeposit;

          await client.query('UPDATE users SET security_deposit_balance = $1, security_deposit_paid = $2 WHERE id = $3', [newBal, isPaid, user_id]);

          await client.query(`
            INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
            VALUES ($1, $2, 'deposit', $3, CURRENT_TIMESTAMP)
          `, [user_id, depPaid, `Security Deposit Verified (${utr})`]);
        }
      }

      await client.query('COMMIT');
      return res.json({ success: true, message: 'Plan booking payment verified and approved!' });
    }

    // 2. Check if this is a Security Deposit Refund
    if (utr.includes('DEPOSIT_REFUND') || utr.includes('REFUND')) {
      await client.query("UPDATE wallet_approvals SET status = 'success' WHERE id = $1", [id]);
      await client.query("UPDATE users SET security_deposit_balance = 0.00, security_deposit_paid = false WHERE id = $1", [user_id]);

      await client.query(`
        INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
        VALUES ($1, $2, 'refund', $3, CURRENT_TIMESTAMP)
      `, [user_id, amount, `Security Deposit Refund (${utr})`]);

      let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
      if (walletRes.rows.length > 0) {
        await client.query(`
          INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp) 
          VALUES ($1, $2, 'debit', $3, $4, 'success', CURRENT_TIMESTAMP)
        `, [`TXN-REF-${Date.now()}`, walletRes.rows[0].id, amount, `Deposit Refund to ${utr}`]);
      }
    } else {
      // 3. Wallet Recharge
      await client.query("UPDATE wallet_approvals SET status = 'success' WHERE id = $1", [id]);

      let walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
      let walletId = null;
      if (walletRes.rows.length === 0) {
        const newW = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2) RETURNING id', [user_id, amount]);
        walletId = newW.rows[0].id;
      } else {
        walletId = walletRes.rows[0].id;
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, walletId]);
      }

      await client.query(`
        INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, timestamp) 
        VALUES ($1, $2, 'credit', $3, $4, 'success', CURRENT_TIMESTAMP)
      `, [`TXN-RCH-${Date.now()}`, walletId, amount, `Wallet Recharge (${utr})`]);

      await client.query('COMMIT');
      await autoDeductRentalDueFromWallet(user_id);
      return res.json({ success: true, message: 'Wallet recharge approved and balance credited!' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Approval processed successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/wallet_approvals/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE wallet_approvals SET status = $1 WHERE id = $2', ['rejected', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mobile App Submit Security Deposit Refund Request
app.post('/api/wallet/withdraw-deposit', authenticateToken, async (req, res) => {
  try {
    const { upi_id } = req.body;
    const user_id = req.user.id;

    const userRes = await pool.query('SELECT security_deposit_balance, security_deposit_paid FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const depBal = parseFloat(userRes.rows[0].security_deposit_balance || 2500);

    const result = await pool.query(`
      INSERT INTO wallet_approvals (user_id, amount, utr, status, date)
      VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [user_id, depBal, `DEPOSIT_REFUND_UPI: ${upi_id || 'N/A'}`]);

    res.json({ success: true, message: 'Deposit refund request submitted for admin approval', request: result.rows[0] });
  } catch (err) {
    console.error('Withdraw deposit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mobile App Submit Wallet Recharge Request (for manual or UPI approval)
app.post('/api/wallet/recharge', authenticateToken, async (req, res) => {
  try {
    const { amount, utr } = req.body;
    const user_id = req.user.id;
    const rechargeAmt = parseFloat(amount || 0);

    if (rechargeAmt <= 0) {
      return res.status(400).json({ error: 'Valid recharge amount is required' });
    }

    const utrNum = utr || `UPI_${Date.now()}`;

    // Ensure wallet_approvals table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_approvals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        utr VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(`
      INSERT INTO wallet_approvals (user_id, amount, utr, status, date)
      VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [user_id, rechargeAmt, utrNum]);

    res.json({ success: true, message: 'Recharge request submitted for approval', request: result.rows[0] });
  } catch (err) {
    console.error('Recharge submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mobile App Fetch Current Wallet & Transactions
app.get('/api/wallet/my-wallet', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Ensure wallet exists
    let walletRes = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [user_id]);
    if (walletRes.rows.length === 0) {
      walletRes = await pool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *', [user_id]);
    }
    const wallet = walletRes.rows[0];

    // 1. Fetch user transactions
    const txnRes = await pool.query(`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = $1
      ORDER BY timestamp DESC
      LIMIT 40
    `, [wallet.id]);

    // 2. Fetch pending approvals for this user
    const pendingRes = await pool.query(`
      SELECT * FROM wallet_approvals
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY date DESC
    `, [user_id]);

    // 3. Fetch security deposit transactions
    const secRes = await pool.query(`
      SELECT * FROM security_deposit_transactions
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT 20
    `, [user_id]);

    const txns = [];

    // Pending approvals
    pendingRes.rows.forEach(p => {
      txns.push({
        id: `REQ-${p.id}`,
        type: 'credit',
        amount: parseFloat(p.amount),
        description: p.utr?.includes('PLAN') ? `${p.utr} (Pending Approval)` : `Wallet Recharge (Pending Approval)`,
        date: new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        timestamp: new Date(p.date).getTime(),
        status: 'pending'
      });
    });

    // Wallet transactions
    txnRes.rows.forEach(t => {
      txns.push({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        date: new Date(t.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        timestamp: new Date(t.timestamp).getTime(),
        status: t.status
      });
    });

    // Security deposit transactions (add those not already in wallet_transactions)
    secRes.rows.forEach(s => {
      const alreadyIncluded = txns.some(t => t.description && t.description.includes(s.remarks || 'Deposit'));
      if (!alreadyIncluded) {
        txns.push({
          id: `SEC-${s.id}`,
          type: s.type === 'deposit' ? 'credit' : 'debit',
          amount: parseFloat(s.amount),
          description: s.remarks || (s.type === 'deposit' ? 'Security Deposit Added' : 'Security Deposit Deducted'),
          date: new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          timestamp: new Date(s.date).getTime(),
          status: 'success'
        });
      }
    });

    // Sort by timestamp descending
    txns.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      balance: parseFloat(wallet.balance || 0),
      transactions: txns
    });
  } catch (err) {
    console.error('My wallet fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BROADCAST NOTIFICATIONS SYSTEM
// ==========================================

// Ensure broadcast_notifications table exists
async function initNotificationTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS broadcast_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        action_type VARCHAR(50) DEFAULT 'none',
        status VARCHAR(50) DEFAULT 'sent',
        recipient_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('Error init notification tables:', e);
  }
}
initNotificationTables();

// 1. Get Due Users Count & Groupings for Reminder Cards
app.get('/api/notifications/active-due-users', authenticateToken, async (req, res) => {
  try {
    const rentalsRes = await pool.query(`
      SELECT 
        r.id as rental_id, r.user_id, r.next_payment_date, r.total_cost,
        u.name as user_name, u.phone as user_phone,
        v.id as vehicle_id, v.model as vehicle_model,
        p.name as plan_name, p.price as plan_price
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN plans p ON p.id = r.plan_id
      WHERE r.status = 'active'
    `);

    const now = new Date();
    const list3to4Days = [];
    const list1to2Days = [];
    const listTodayOrOverdue = [];

    rentalsRes.rows.forEach(r => {
      if (!r.next_payment_date) return;
      const due = new Date(r.next_payment_date);
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const item = {
        rental_id: r.rental_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_phone: r.user_phone,
        vehicle: r.vehicle_model || r.vehicle_id,
        plan_name: r.plan_name,
        price: r.plan_price || r.total_cost,
        next_payment_date: due.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        hoursLeft: Math.round(diffHours)
      };

      if (diffHours <= 12) {
        // Due today or overdue
        listTodayOrOverdue.push(item);
      } else if (diffHours > 12 && diffHours <= 48) {
        // Due in 1-2 days
        list1to2Days.push(item);
      } else if (diffHours > 48 && diffHours <= 96) {
        // Due in 3-4 days
        list3to4Days.push(item);
      }
    });

    res.json({
      due3to4Days: { count: list3to4Days.length, users: list3to4Days },
      due1to2Days: { count: list1to2Days.length, users: list1to2Days },
      dueToday: { count: listTodayOrOverdue.length, users: listTodayOrOverdue }
    });
  } catch (err) {
    console.error('Active due users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Broadcast or Send Targeted Notification
app.post('/api/notifications/broadcast', authenticateToken, async (req, res) => {
  try {
    const { type, user_id, title, message, category, action_type } = req.body;

    let targetTitle = title;
    let targetMessage = message;
    let targetCategory = category || 'general';
    let targetAction = action_type || 'none';
    let targetUserId = user_id === 'all' || !user_id ? null : parseInt(user_id);
    let recipientCount = 1;

    const now = new Date();

    if (type === 'payment_reminder_3d') {
      targetCategory = 'payment_reminder_3d';
      targetAction = 'pay_now';
      targetTitle = title || '📅 EV Subscription Renewal in 3-4 Days';
      targetMessage = message || 'Your EV rental pass is scheduled for renewal in 3-4 days. Tap to pay and ensure uninterrupted daily rides.';

      // Get count of riders due in 3-4 days
      const dueRes = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM rentals 
        WHERE status = 'active' AND next_payment_date IS NOT NULL
        AND next_payment_date > CURRENT_TIMESTAMP + INTERVAL '48 hours'
        AND next_payment_date <= CURRENT_TIMESTAMP + INTERVAL '96 hours'
      `);
      recipientCount = parseInt(dueRes.rows[0]?.count || 0) || 1;
    } else if (type === 'payment_reminder_1d') {
      targetCategory = 'payment_reminder_1d';
      targetAction = 'pay_now';
      targetTitle = title || '⏰ Urgent: EV Pass Due in 24-48 Hours';
      targetMessage = message || 'Your EV rental due date is approaching in 1-2 days. Tap Pay Now to renew your pass instantly.';

      const dueRes = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM rentals 
        WHERE status = 'active' AND next_payment_date IS NOT NULL
        AND next_payment_date > CURRENT_TIMESTAMP + INTERVAL '12 hours'
        AND next_payment_date <= CURRENT_TIMESTAMP + INTERVAL '48 hours'
      `);
      recipientCount = parseInt(dueRes.rows[0]?.count || 0) || 1;
    } else if (type === 'payment_reminder_today') {
      targetCategory = 'payment_reminder_today';
      targetAction = 'pay_now';
      targetTitle = title || '🚨 Action Required: Payment Due Today!';
      targetMessage = message || 'Your EV rental pass is due today! Complete your payment now to avoid vehicle auto-lock and late fee.';

      const dueRes = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM rentals 
        WHERE status = 'active' AND next_payment_date IS NOT NULL
        AND next_payment_date <= CURRENT_TIMESTAMP + INTERVAL '12 hours'
      `);
      recipientCount = parseInt(dueRes.rows[0]?.count || 0) || 1;
    } else {
      // Custom notification
      if (targetUserId === null) {
        const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
        recipientCount = parseInt(userCountRes.rows[0]?.count || 0);
      }
    }

    if (!targetTitle || !targetMessage) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const insertRes = await pool.query(`
      INSERT INTO broadcast_notifications (user_id, title, message, category, action_type, status, recipient_count, created_at)
      VALUES ($1, $2, $3, $4, $5, 'sent', $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [targetUserId, targetTitle, targetMessage, targetCategory, targetAction, recipientCount]);

    res.json({
      success: true,
      message: `Notification broadcast sent successfully to ${recipientCount} user(s)!`,
      notification: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Broadcast notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin Notification History
app.get('/api/notifications/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id, b.title, b.message, b.category, b.action_type, b.status, b.recipient_count, b.created_at,
        u.name as targeted_user_name, u.phone as targeted_user_phone
      FROM broadcast_notifications b
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Mobile App Get My Notifications
app.get('/api/notifications/my-notifications', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const result = await pool.query(`
      SELECT id, title, message, category, action_type, created_at
      FROM broadcast_notifications
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `, [user_id]);

    const formatted = result.rows.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      category: n.category,
      action_type: n.action_type,
      timeAgo: new Date(n.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
      date: n.created_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch my notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CASHFREE KYC (DIGILOCKER AADHAAR) APIs
// ==========================================

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === 'PRODUCTION' 
  ? 'https://api.cashfree.com/verification' 
  : 'https://sandbox.cashfree.com/verification';

// 1. Initiate Aadhaar Verification (Called by Mobile App)
app.post('/api/kyc/aadhaar/initiate', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id || req.body.user_id; // Assume mobile passes user_id if needed
    
    // Call Cashfree API to generate Digilocker verification link
    // Note: This is standard representation of Cashfree Verification API
    const response = await fetch(`${CASHFREE_BASE_URL}/digilocker/create-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify({
        verification_id: `KYC_${user_id}_${Date.now()}`,
        redirect_url: "localtoto://kyc-success" // Mobile deep link
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cashfree Error: ${errorData.message}`);
    }

    const data = await response.json();
    
    // Save reference ID to DB
    await pool.query('UPDATE users SET cashfree_ref = $1, kyc_status = $2 WHERE id = $3', [data.verification_id, 'in_progress', user_id]);

    res.json({ success: true, verification_url: data.url, verification_id: data.verification_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Webhook for Cashfree to notify us when Aadhaar is verified
app.post('/api/kyc/webhook/cashfree', async (req, res) => {
  try {
    const { verification_id, status, aadhaar_number } = req.body;
    
    // In production, verify the webhook signature here using your Secret!
    
    if (status === 'SUCCESS') {
      await pool.query('UPDATE users SET kyc_status = $1 WHERE cashfree_ref = $2', ['verified', verification_id]);
      
      // Auto-approve their account approval document if they had one pending
      await pool.query(`
        UPDATE account_approvals a
        SET status = 'approved'
        FROM users u
        WHERE u.id = a.user_id AND u.cashfree_ref = $1 AND a.document_type = 'Aadhar Card'
      `, [verification_id]);
      
    } else if (status === 'FAILED') {
      await pool.query('UPDATE users SET kyc_status = $1 WHERE cashfree_ref = $2', ['failed', verification_id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PLANS APIs
// ==========================================

// List Plans
app.get('/api/plans', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Plan
app.post('/api/plans', authenticateToken, async (req, res) => {
  try {
    const { name, type, price, security_deposit } = req.body;
    const result = await pool.query(
      'INSERT INTO plans (name, type, price, security_deposit) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, price, security_deposit]
    );
    res.json({ success: true, plan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Plan
app.put('/api/plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, price, security_deposit } = req.body;
    const result = await pool.query(
      'UPDATE plans SET name = $1, type = $2, price = $3, security_deposit = $4 WHERE id = $5 RETURNING *',
      [name, type, price, security_deposit, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true, plan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Plan
app.delete('/api/plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM plans WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DASHBOARD & STANDS APIs
// ==========================================

// Dashboard Aggregated Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const activeRides = await pool.query("SELECT COUNT(*) FROM rentals WHERE status = 'active'");
    const revenue = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE type = 'credit'");
    const fleetStatus = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available FROM vehicles");

    const totalVehicles = parseInt(fleetStatus.rows[0].total) || 1;
    const availableVehicles = parseInt(fleetStatus.rows[0].available) || 0;
    const fleetHealth = Math.round((availableVehicles / totalVehicles) * 100);

    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      activeRides: parseInt(activeRides.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      fleetHealth: fleetHealth
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Stands
app.get('/api/stands', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*, 
        COUNT(v.id) as current_vehicles 
      FROM stands s 
      LEFT JOIN vehicles v ON v.location = s.name 
      GROUP BY s.id 
      ORDER BY s.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Stand
app.post('/api/stands', authenticateToken, async (req, res) => {
  try {
    const { name, address, capacity } = req.body;
    
    const result = await pool.query(
      'INSERT INTO stands (name, address, capacity) VALUES ($1, $2, $3) RETURNING *',
      [name, address, capacity || 10]
    );
    res.json({ success: true, stand: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Stand
app.put('/api/stands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, capacity } = req.body;
    const result = await pool.query(
      'UPDATE stands SET name = $1, address = $2, capacity = $3 WHERE id = $4 RETURNING *',
      [name, address, capacity, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Stand not found' });
    res.json({ success: true, stand: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Stand
app.delete('/api/stands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stands WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Stand not found' });
    res.json({ success: true, message: 'Stand deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SECURITY DEPOSIT MANAGEMENT APIs
// ==========================================

// Get global security deposit config
app.get('/api/security-deposits/config', authenticateToken, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `);
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
    const min_security_deposit = result.rows.length > 0 ? parseFloat(result.rows[0].value) : 2000;
    res.json({ min_security_deposit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update global security deposit config
app.put('/api/security-deposits/config', authenticateToken, async (req, res) => {
  try {
    const { min_security_deposit } = req.body;
    if (min_security_deposit === undefined || isNaN(min_security_deposit)) {
      return res.status(400).json({ error: 'Valid minimum security deposit is required' });
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `);
    await pool.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('min_security_deposit', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [min_security_deposit.toString()]);
    res.json({ success: true, min_security_deposit: parseFloat(min_security_deposit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users security deposit list
app.get('/api/security-deposits', authenticateToken, async (req, res) => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_deposit_paid BOOLEAN NOT NULL DEFAULT false`);
    
    // Get min deposit setting
    const configRes = await pool.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
    const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.phone, u.email, u.status, u.kyc_status,
        COALESCE(u.security_deposit_balance, 0) as security_deposit_balance,
        CASE 
          WHEN COALESCE(u.security_deposit_balance, 0) >= $1 OR u.security_deposit_paid = true THEN true 
          ELSE false 
        END as security_deposit_paid
      FROM users u
      ORDER BY u.id DESC
    `, [minDeposit]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Security Deposit to user
app.post('/api/security-deposits/add', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    const depositAmount = parseFloat(amount || 0);
    if (depositAmount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    await client.query('BEGIN');

    // Get min deposit
    const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
    const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    const newBalance = currentBalance + depositAmount;
    const isPaid = newBalance >= minDeposit;

    await client.query(`
      UPDATE users 
      SET security_deposit_balance = $1, security_deposit_paid = $2
      WHERE id = $3
    `, [newBalance, isPaid, user_id]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS security_deposit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        remarks TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, 'deposit', $3, CURRENT_TIMESTAMP)
    `, [user_id, depositAmount, remarks || 'Admin Deposit Addition']);

    await client.query('COMMIT');
    res.json({ success: true, balance: newBalance, security_deposit_paid: isPaid });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Deduct Security Deposit from user
app.post('/api/security-deposits/deduct', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    const deductAmount = parseFloat(amount || 0);
    if (deductAmount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    await client.query('BEGIN');

    const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
    const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    const newBalance = Math.max(0, currentBalance - deductAmount);
    const isPaid = newBalance >= minDeposit;

    await client.query(`
      UPDATE users 
      SET security_deposit_balance = $1, security_deposit_paid = $2
      WHERE id = $3
    `, [newBalance, isPaid, user_id]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS security_deposit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        remarks TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, 'deduction', $3, CURRENT_TIMESTAMP)
    `, [user_id, deductAmount, remarks || 'Admin Deduction']);

    await client.query('COMMIT');
    res.json({ success: true, balance: newBalance, security_deposit_paid: isPaid });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Set Exact Security Deposit for user
app.post('/api/security-deposits/set', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, remarks } = req.body;
    const newBalance = Math.max(0, parseFloat(amount || 0));

    await client.query('BEGIN');

    const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'min_security_deposit'");
    const minDeposit = configRes.rows.length > 0 ? parseFloat(configRes.rows[0].value) : 2000;

    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(userRes.rows[0].security_deposit_balance || 0);
    const diff = newBalance - currentBalance;
    const isPaid = newBalance >= minDeposit;

    await client.query(`
      UPDATE users 
      SET security_deposit_balance = $1, security_deposit_paid = $2
      WHERE id = $3
    `, [newBalance, isPaid, user_id]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS security_deposit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        remarks TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      INSERT INTO security_deposit_transactions (user_id, amount, type, remarks, date)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [user_id, Math.abs(diff), diff >= 0 ? 'deposit' : 'deduction', remarks || `Admin updated deposit balance to ₹${newBalance}`]);

    await client.query('COMMIT');
    res.json({ success: true, balance: newBalance, security_deposit_paid: isPaid });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get User Deposit History
app.get('/api/security-deposits/:userId/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
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
    const result = await pool.query(`
      SELECT * FROM security_deposit_transactions
      WHERE user_id = $1
      ORDER BY date DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth me profile endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, name, phone, email, role, status, kyc_status,
        COALESCE(security_deposit_paid, false) as security_deposit_paid,
        COALESCE(security_deposit_balance, 0) as security_deposit_balance,
        wallet_balance
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the React Admin Dashboard in production
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Express 5 catch-all fallback for React Router
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on http://0.0.0.0:${PORT}`);
});
