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

// Legacy alias for backward compatibility
export const pool = db;

// Create Redis client with proper error handling
let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    commandTimeout: 5000,
  });

  // Handle Redis errors to prevent unhandled error events
  redis.on('error', (error) => {
    console.warn('Redis error (continuing without Redis):', error.message);
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });

  redis.on('close', () => {
    console.log('Redis connection closed');
  });
} catch (error) {
  console.warn('Failed to create Redis client:', error.message);
  redis = null;
}

export { redis };

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
  if (redis) {
    console.log('REDIS_URL preview:', process.env.REDIS_URL?.substring(0, 30) + '...');
    try {
      await redis.connect();
      console.log('Redis connected successfully');
    } catch (redisError) {
      console.warn('Redis connection failed, app will continue without caching:', redisError.message);
      // Don't throw - Redis is optional for basic functionality
    }
  } else {
    console.log('Redis client not initialized, continuing without Redis');
  }
};

export const closeDatabases = async (): Promise<void> => {
  try {
    await db.end();
    if (redis) {
      redis.disconnect();
    }
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};