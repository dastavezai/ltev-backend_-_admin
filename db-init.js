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

const executeInit = async () => {
  try {
    console.log('Starting Database Initialization...');

    // 1. Drop existing tables to ensure a clean slate
    console.log('Dropping existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS maintenance_logs CASCADE;
      DROP TABLE IF EXISTS rentals CASCADE;
      DROP TABLE IF EXISTS wallet_transactions CASCADE;
      DROP TABLE IF EXISTS wallet_approvals CASCADE;
      DROP TABLE IF EXISTS wallets CASCADE;
      DROP TABLE IF EXISTS account_approvals CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
    `);

    // 2. Create tables
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        joined_date DATE NOT NULL DEFAULT CURRENT_DATE
      );

      CREATE TABLE wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE wallet_transactions (
        id VARCHAR(50) PRIMARY KEY,
        wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- credit or debit
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255),
        reference_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'success',
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE stands (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 10
      );

      CREATE TABLE vehicles (
        id VARCHAR(50) PRIMARY KEY,
        model VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        battery INTEGER NOT NULL,
        location VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 7),
        lng DECIMAL(10, 7)
      );

      CREATE TABLE rentals (
        id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        vehicle_id VARCHAR(50) REFERENCES vehicles(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        total_cost DECIMAL(10, 2),
        status VARCHAR(50) NOT NULL
      );

      CREATE TABLE maintenance_logs (
        id SERIAL PRIMARY KEY,
        vehicle_id VARCHAR(50) REFERENCES vehicles(id),
        issue_description TEXT NOT NULL,
        cost DECIMAL(10, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        date_reported DATE NOT NULL DEFAULT CURRENT_DATE
      );

      CREATE TABLE account_approvals (
        id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        document_type VARCHAR(50) NOT NULL,
        document_number VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        date DATE NOT NULL DEFAULT CURRENT_DATE
      );
      
      CREATE TABLE wallet_approvals (
        id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        utr VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        date DATE NOT NULL DEFAULT CURRENT_DATE
      );
    `);

    // 3. Insert Genuine Data
      SELECT setval('wallets_id_seq', (SELECT MAX(id) FROM wallets));
    `);

    console.log('Database Initialization Complete!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
};

executeInit();
