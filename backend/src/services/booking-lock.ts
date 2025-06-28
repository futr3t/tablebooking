import { redis } from '../config/database';

export class BookingLockService {
  private static readonly LOCK_TIMEOUT = 30; // seconds
  private static readonly LOCK_PREFIX = 'booking-lock:';

  static async acquireLock(
    restaurantId: string,
    date: string,
    time: string,
    tableId?: string
  ): Promise<string | null> {
    try {
      const lockKey = this.generateLockKey(restaurantId, date, time, tableId);
      const lockValue = this.generateLockValue();

      // Try to acquire lock with expiration
      const result = await redis.set(
        lockKey,
        lockValue,
        'EX',
        this.LOCK_TIMEOUT,
        'NX'
      );

      return result === 'OK' ? lockValue : null;
    } catch (error) {
      console.error('Error acquiring booking lock:', error);
      return null;
    }
  }

  static async releaseLock(
    restaurantId: string,
    date: string,
    time: string,
    lockValue: string,
    tableId?: string
  ): Promise<boolean> {
    try {
      const lockKey = this.generateLockKey(restaurantId, date, time, tableId);

      // Use Lua script to ensure we only delete if we own the lock
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redis.eval(luaScript, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      console.error('Error releasing booking lock:', error);
      return false;
    }
  }

  static async extendLock(
    restaurantId: string,
    date: string,
    time: string,
    lockValue: string,
    tableId?: string
  ): Promise<boolean> {
    try {
      const lockKey = this.generateLockKey(restaurantId, date, time, tableId);

      // Use Lua script to extend lock only if we own it
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await redis.eval(
        luaScript,
        1,
        lockKey,
        lockValue,
        this.LOCK_TIMEOUT.toString()
      );

      return result === 1;
    } catch (error) {
      console.error('Error extending booking lock:', error);
      return false;
    }
  }

  static async withLock<T>(
    restaurantId: string,
    date: string,
    time: string,
    operation: () => Promise<T>,
    tableId?: string
  ): Promise<T> {
    const lockValue = await this.acquireLock(restaurantId, date, time, tableId);
    
    if (!lockValue) {
      throw new Error('Unable to acquire booking lock - another operation in progress');
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseLock(restaurantId, date, time, lockValue, tableId);
    }
  }

  static async acquireTableLock(tableId: string): Promise<string | null> {
    try {
      const lockKey = `${this.LOCK_PREFIX}table:${tableId}`;
      const lockValue = this.generateLockValue();

      const result = await redis.set(
        lockKey,
        lockValue,
        'EX',
        this.LOCK_TIMEOUT,
        'NX'
      );

      return result === 'OK' ? lockValue : null;
    } catch (error) {
      console.error('Error acquiring table lock:', error);
      return null;
    }
  }

  static async releaseTableLock(tableId: string, lockValue: string): Promise<boolean> {
    try {
      const lockKey = `${this.LOCK_PREFIX}table:${tableId}`;

      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redis.eval(luaScript, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      console.error('Error releasing table lock:', error);
      return false;
    }
  }

  static async withTableLock<T>(
    tableId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockValue = await this.acquireTableLock(tableId);
    
    if (!lockValue) {
      throw new Error('Unable to acquire table lock - another operation in progress');
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseTableLock(tableId, lockValue);
    }
  }

  private static generateLockKey(
    restaurantId: string,
    date: string,
    time: string,
    tableId?: string
  ): string {
    const baseKey = `${this.LOCK_PREFIX}${restaurantId}:${date}:${time}`;
    return tableId ? `${baseKey}:${tableId}` : baseKey;
  }

  private static generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  static async cleanupExpiredLocks(): Promise<void> {
    try {
      const pattern = `${this.LOCK_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return;
      }

      // Check which keys are still valid (non-expired)
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.ttl(key);
      }
      
      const ttls = await pipeline.exec();
      
      if (!ttls) {
        return;
      }

      // Delete expired locks (TTL = -1 means no expiration, TTL = -2 means expired)
      const expiredKeys = keys.filter((key, index) => {
        const ttl = ttls[index];
        return ttl && ttl[1] === -2;
      });

      if (expiredKeys.length > 0) {
        await redis.del(...expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length} expired booking locks`);
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }
}

// Run lock cleanup every 5 minutes
setInterval(() => {
  BookingLockService.cleanupExpiredLocks();
}, 5 * 60 * 1000);