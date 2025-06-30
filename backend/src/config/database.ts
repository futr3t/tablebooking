import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export const connectDatabases = async (): Promise<void> => {
  try {
    console.log('Attempting to connect to databases...');
    console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
    console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    const client = await db.connect();
    console.log('PostgreSQL connected successfully');
    client.release();

    console.log('REDIS_URL preview:', process.env.REDIS_URL?.substring(0, 30) + '...');
    await redis.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    console.log('Environment variables:');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
    throw error;
  }
};

export const closeDatabases = async (): Promise<void> => {
  try {
    await db.end();
    redis.disconnect();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};