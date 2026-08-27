-- Database Schema for lt.admin

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  location VARCHAR(255) NOT NULL,
  battery INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  kyc_status VARCHAR(50) NOT NULL DEFAULT 'approved',
  security_deposit_paid BOOLEAN NOT NULL DEFAULT false,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS rentals (
  id VARCHAR(50) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  cost DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS account_approvals (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS wallet_approvals (
  id VARCHAR(50) PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  utr VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS stands (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10
);

-- Insert dummy data for testing (optional)
INSERT INTO users (name, email, phone, status, wallet_balance) VALUES
('Rahul Sharma', 'rahul@example.com', '9876543210', 'active', 1500.00),
('Amit Kumar', 'amit@example.com', '9123456780', 'inactive', 0.00)
ON CONFLICT DO NOTHING;

INSERT INTO vehicles (name, type, status, location, battery) VALUES
('Scooter 001', 'Electric', 'available', 'Connaught Place', 85),
('Bike 002', 'Electric', 'in_use', 'Hauz Khas', 42)
ON CONFLICT DO NOTHING;
