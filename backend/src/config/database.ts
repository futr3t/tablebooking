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
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

export const connectDatabases = async (): Promise<void> => {
  console.log('Attempting to connect to databases...');
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
  console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');
  
  // PostgreSQL is required
  try {
    const client = await db.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    throw error;
  }

  // Redis is optional - app can work without it
  console.log('REDIS_URL preview:', process.env.REDIS_URL?.substring(0, 30) + '...');
  try {
    await redis.connect();
    console.log('Redis connected successfully');
  } catch (redisError) {
    console.warn('Redis connection failed, app will continue without caching:', redisError.message);
    // Don't throw - Redis is optional for basic functionality
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