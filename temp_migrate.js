import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE rentals ALTER COLUMN vehicle_id DROP NOT NULL;
      ALTER TABLE rentals ALTER COLUMN start_time DROP NOT NULL;
      
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE rentals ADD COLUMN plan_id INTEGER REFERENCES plans(id);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column plan_id already exists in rentals.';
        END;
      END $$;
    `);
    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

runMigration();
