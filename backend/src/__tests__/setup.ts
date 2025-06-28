import { jest } from '@jest/globals';

// Mock Redis
jest.mock('../config/database', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    pipeline: jest.fn(),
    eval: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  },
  db: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  },
  connectDatabases: jest.fn(),
  closeDatabases: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Suppress console logs during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();