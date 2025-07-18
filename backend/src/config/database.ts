import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Legacy alias for backward compatibility
export const pool = db;


export const connectDatabases = async (): Promise<void> => {
  console.log('Attempting to connect to PostgreSQL...');
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
  console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');
  
  // PostgreSQL connection
  try {
    const client = await db.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    throw error;
  }
};

export const closeDatabases = async (): Promise<void> => {
  try {
    await db.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};