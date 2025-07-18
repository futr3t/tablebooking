import { jest } from '@jest/globals';

// Mock database
jest.mock('../config/database', () => ({
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

// Suppress console logs during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();