import { BookingLockService } from '../services/booking-lock';
import { redis } from '../config/database';

jest.mock('../config/database');

const mockRedis = redis as jest.Mocked<typeof redis>;

describe('BookingLockService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );

      expect(lockValue).toBeTruthy();
      expect(typeof lockValue).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'booking-lock:restaurant-1:2024-01-03:18:00:table-1',
        lockValue,
        'EX',
        30,
        'NX'
      );
    });

    it('should fail to acquire lock when already locked', async () => {
      mockRedis.set.mockResolvedValue(null);

      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );

      expect(lockValue).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );

      expect(lockValue).toBeNull();
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await BookingLockService.releaseLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'test-lock-value',
        'table-1'
      );

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        1,
        'booking-lock:restaurant-1:2024-01-03:18:00:table-1',
        'test-lock-value'
      );
    });

    it('should fail to release lock with wrong value', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await BookingLockService.releaseLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'wrong-lock-value',
        'table-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('withLock', () => {
    it('should execute operation within lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const mockOperation = jest.fn().mockResolvedValue('operation-result');

      const result = await BookingLockService.withLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        mockOperation,
        'table-1'
      );

      expect(result).toBe('operation-result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalled(); // Lock acquired
      expect(mockRedis.eval).toHaveBeenCalled(); // Lock released
    });

    it('should throw error when unable to acquire lock', async () => {
      mockRedis.set.mockResolvedValue(null);

      const mockOperation = jest.fn();

      await expect(
        BookingLockService.withLock(
          'restaurant-1',
          '2024-01-03',
          '18:00',
          mockOperation,
          'table-1'
        )
      ).rejects.toThrow('Unable to acquire booking lock');

      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should release lock even if operation throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        BookingLockService.withLock(
          'restaurant-1',
          '2024-01-03',
          '18:00',
          mockOperation,
          'table-1'
        )
      ).rejects.toThrow('Operation failed');

      expect(mockRedis.eval).toHaveBeenCalled(); // Lock should still be released
    });
  });

  describe('extendLock', () => {
    it('should extend lock successfully', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await BookingLockService.extendLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'test-lock-value',
        'table-1'
      );

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("expire", KEYS[1], ARGV[2])'),
        1,
        'booking-lock:restaurant-1:2024-01-03:18:00:table-1',
        'test-lock-value',
        '30'
      );
    });

    it('should fail to extend lock with wrong value', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await BookingLockService.extendLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'wrong-lock-value',
        'table-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('table locks', () => {
    it('should acquire table lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const lockValue = await BookingLockService.acquireTableLock('table-1');

      expect(lockValue).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'booking-lock:table:table-1',
        lockValue,
        'EX',
        30,
        'NX'
      );
    });

    it('should execute operation within table lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const mockOperation = jest.fn().mockResolvedValue('table-operation-result');

      const result = await BookingLockService.withTableLock('table-1', mockOperation);

      expect(result).toBe('table-operation-result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should clean up expired locks', async () => {
      const mockKeys = [
        'booking-lock:restaurant-1:2024-01-03:18:00:table-1',
        'booking-lock:restaurant-1:2024-01-03:18:30:table-2'
      ];

      mockRedis.keys.mockResolvedValue(mockKeys);
      
      // Mock pipeline
      const mockPipeline = {
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, -2], // Expired
          [null, 15]  // Still valid
        ])
      };
      
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockRedis.del.mockResolvedValue(1);

      await BookingLockService.cleanupExpiredLocks();

      expect(mockRedis.keys).toHaveBeenCalledWith('booking-lock:*');
      expect(mockRedis.del).toHaveBeenCalledWith(mockKeys[0]); // Only expired key
    });

    it('should handle no expired locks', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await BookingLockService.cleanupExpiredLocks();

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during cleanup', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(BookingLockService.cleanupExpiredLocks()).resolves.toBeUndefined();
    });
  });

  describe('lock key generation', () => {
    it('should generate consistent lock keys', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await BookingLockService.acquireLock('restaurant-1', '2024-01-03', '18:00');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'booking-lock:restaurant-1:2024-01-03:18:00',
        expect.any(String),
        'EX',
        30,
        'NX'
      );
    });

    it('should include table ID in lock key when provided', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await BookingLockService.acquireLock('restaurant-1', '2024-01-03', '18:00', 'table-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'booking-lock:restaurant-1:2024-01-03:18:00:table-1',
        expect.any(String),
        'EX',
        30,
        'NX'
      );
    });
  });
});