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
    console.log('Starting Stands Database Alteration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        capacity INT DEFAULT 10,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert some realistic seed data for stands in Bengaluru
    const check = await pool.query('SELECT COUNT(*) FROM stands');
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO stands (name, address, capacity) VALUES 
        ('Koramangala 4th Block Hub', 'Near Sony World Junction, Koramangala, Bengaluru', 15),
        ('Indiranagar Metro Station', 'Below Indiranagar Metro, CMH Road, Bengaluru', 20),
        ('HSR Layout Sector 2', '27th Main Road, HSR Layout, Bengaluru', 10),
        ('Whitefield Tech Park', 'ITPL Main Road, Whitefield, Bengaluru', 25)
      `);
      console.log('Inserted seed stands data.');
    }

    console.log('Stands Database Alteration Complete!');
  } catch (err) {
    console.error('Error altering Stands database:', err);
  } finally {
    await pool.end();
  }
};

executeAlter();
