import { BookingLockService } from '../services/booking-lock';

describe('BookingLockService', () => {
  beforeEach(() => {
    // Clear any existing locks before each test
    BookingLockService.cleanupExpiredLocks();
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );

      expect(lockValue).toBeTruthy();
      expect(typeof lockValue).toBe('string');
    });

    it('should fail to acquire lock when already held', async () => {
      // First lock should succeed
      const lockValue1 = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue1).toBeTruthy();

      // Second lock should fail
      const lockValue2 = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue2).toBeNull();
    });

    it('should allow acquiring lock for different time slots', async () => {
      const lockValue1 = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      const lockValue2 = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:30',
        'table-1'
      );

      expect(lockValue1).toBeTruthy();
      expect(lockValue2).toBeTruthy();
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue).toBeTruthy();

      const released = await BookingLockService.releaseLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        lockValue!,
        'table-1'
      );
      expect(released).toBe(true);

      // Should be able to acquire the lock again
      const newLockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(newLockValue).toBeTruthy();
    });

    it('should fail to release lock with wrong value', async () => {
      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue).toBeTruthy();

      const released = await BookingLockService.releaseLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'wrong-value',
        'table-1'
      );
      expect(released).toBe(false);
    });
  });

  describe('extendLock', () => {
    it('should extend lock successfully', async () => {
      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue).toBeTruthy();

      const extended = await BookingLockService.extendLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        lockValue!,
        'table-1'
      );
      expect(extended).toBe(true);
    });

    it('should fail to extend lock with wrong value', async () => {
      const lockValue = await BookingLockService.acquireLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'table-1'
      );
      expect(lockValue).toBeTruthy();

      const extended = await BookingLockService.extendLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        'wrong-value',
        'table-1'
      );
      expect(extended).toBe(false);
    });
  });

  describe('withLock', () => {
    it('should execute operation with lock', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await BookingLockService.withLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        mockOperation,
        'table-1'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on lock acquisition failure', async () => {
      let callCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Operation failed');
        }
        return 'success';
      });

      const result = await BookingLockService.withLock(
        'restaurant-1',
        '2024-01-03',
        '18:00',
        mockOperation,
        'table-1'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('table locks', () => {
    it('should acquire and release table lock', async () => {
      const lockValue = await BookingLockService.acquireTableLock('table-1');
      expect(lockValue).toBeTruthy();

      const released = await BookingLockService.releaseTableLock('table-1', lockValue!);
      expect(released).toBe(true);
    });

    it('should work with table lock operation', async () => {
      const mockOperation = jest.fn().mockResolvedValue('table-success');

      const result = await BookingLockService.withTableLock(
        'table-1',
        mockOperation
      );

      expect(result).toBe('table-success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should clean up expired locks', async () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      
      Date.now = jest.fn(() => currentTime);

      try {
        // Acquire a lock
        const lockValue = await BookingLockService.acquireLock(
          'restaurant-1',
          '2024-01-03',
          '18:00',
          'table-1'
        );
        expect(lockValue).toBeTruthy();

        // Advance time beyond lock timeout (10 seconds)
        currentTime += 15000;

        // Cleanup should remove expired locks
        await BookingLockService.cleanupExpiredLocks();

        // Should be able to acquire the lock again
        const newLockValue = await BookingLockService.acquireLock(
          'restaurant-1',
          '2024-01-03',
          '18:00',
          'table-1'
        );
        expect(newLockValue).toBeTruthy();
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe('getLockStats', () => {
    it('should return lock statistics', async () => {
      const stats1 = BookingLockService.getLockStats();
      expect(stats1.total).toBe(0);
      expect(stats1.active).toBe(0);
      expect(stats1.expired).toBe(0);

      // Acquire some locks
      await BookingLockService.acquireLock('restaurant-1', '2024-01-03', '18:00', 'table-1');
      await BookingLockService.acquireLock('restaurant-1', '2024-01-03', '18:30', 'table-2');

      const stats2 = BookingLockService.getLockStats();
      expect(stats2.total).toBe(2);
      expect(stats2.active).toBe(2);
      expect(stats2.expired).toBe(0);
    });
  });
});