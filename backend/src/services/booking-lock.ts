import { redis } from '../config/database';

export class BookingLockService {
  private static readonly LOCK_TIMEOUT = 10; // seconds - reduced from 30 to prevent stuck locks
  private static readonly LOCK_PREFIX = 'booking-lock:';

  static async acquireLock(
    restaurantId: string,
    date: string,
    time: string,
    tableId?: string
  ): Promise<string | null> {
    // If Redis is not available, return null (no locking)
    if (!redis) {
      console.warn('Redis not available, skipping lock acquisition');
      return null;
    }

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
    // If Redis is not available, return true (no locking to release)
    if (!redis) {
      return true;
    }

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
    // If Redis is not available, return true (no locking to extend)
    if (!redis) {
      return true;
    }

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
    // TEMPORARY FIX: Disable Redis locking in production to bypass the issue
    // This reduces consistency but allows the system to continue functioning
    if (!redis || process.env.NODE_ENV === 'production') {
      const reason = !redis ? 'Redis not available' : 'Production Redis bypass enabled';
      console.warn(`${reason}, running operation without distributed locking`);
      try {
        return await operation();
      } catch (error: any) {
        // Preserve the original error when Redis is unavailable
        console.error('Operation failed without locking:', error);
        throw error;
      }
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    let lastOperationError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const lockValue = await this.acquireLock(restaurantId, date, time, tableId);
      
      if (lockValue) {
        try {
          const result = await operation();
          return result;
        } catch (error: any) {
          // Store the operation error - this might be the actual issue
          lastOperationError = error;
          console.error('Operation failed within lock:', error);
          
          // If it's a database error or other non-lock related error, throw it immediately
          if (this.isNonRetryableError(error)) {
            throw error;
          }
          
          // For other errors, log and retry
          console.log(`Operation failed, will retry. Error: ${error.message}`);
        } finally {
          await this.releaseLock(restaurantId, date, time, lockValue, tableId);
        }
      }
      
      // If this is the last attempt, decide what error to throw
      if (attempt === maxRetries) {
        if (lastOperationError && this.isNonRetryableError(lastOperationError)) {
          // Throw the actual operation error if it's non-retryable
          throw lastOperationError;
        } else if (lastOperationError) {
          // Wrap the operation error with lock context
          const lockError = new Error(`Booking operation failed after ${maxRetries} attempts: ${lastOperationError.message}`);
          (lockError as any).originalError = lastOperationError;
          throw lockError;
        } else {
          // Only throw generic lock error if we never got a lock
          throw new Error('Unable to acquire booking lock - system is busy, please try again');
        }
      }
      
      // Wait before retrying
      console.log(`Lock acquisition failed, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    // This should never be reached due to the throw above, but TypeScript requires it
    throw new Error('Unable to acquire booking lock - maximum retries exceeded');
  }

  /**
   * Determines if an error should not be retried (e.g., database schema errors, validation errors)
   */
  private static isNonRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Database schema/column errors should not be retried
    if (message.includes('column') && message.includes('does not exist')) {
      return true;
    }
    
    // SQL syntax errors should not be retried
    if (message.includes('syntax error')) {
      return true;
    }
    
    // Validation errors should not be retried
    if (message.includes('validation') || message.includes('invalid')) {
      return true;
    }
    
    // Not found errors should not be retried
    if (message.includes('not found')) {
      return true;
    }
    
    // Authentication/authorization errors should not be retried
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return true;
    }
    
    return false;
  }

  static async acquireTableLock(tableId: string): Promise<string | null> {
    // If Redis is not available, return null (no locking)
    if (!redis) {
      console.warn('Redis not available, skipping table lock acquisition');
      return null;
    }

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
    // If Redis is not available, return true (no locking to release)
    if (!redis) {
      return true;
    }

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
    // TEMPORARY FIX: Disable Redis locking in production to bypass the issue
    // This reduces consistency but allows the system to continue functioning
    if (!redis || process.env.NODE_ENV === 'production') {
      const reason = !redis ? 'Redis not available' : 'Production Redis table bypass enabled';
      console.warn(`${reason}, running table operation without distributed locking`);
      try {
        return await operation();
      } catch (error: any) {
        // Preserve the original error when Redis is unavailable
        console.error('Table operation failed without locking:', error);
        throw error;
      }
    }

    const maxRetries = 3;
    const retryDelay = 500; // 0.5 seconds for table locks
    let lastOperationError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const lockValue = await this.acquireTableLock(tableId);
      
      if (lockValue) {
        try {
          const result = await operation();
          return result;
        } catch (error: any) {
          // Store the operation error - this might be the actual issue
          lastOperationError = error;
          console.error('Table operation failed within lock:', error);
          
          // If it's a database error or other non-lock related error, throw it immediately
          if (this.isNonRetryableError(error)) {
            throw error;
          }
          
          // For other errors, log and retry
          console.log(`Table operation failed, will retry. Error: ${error.message}`);
        } finally {
          await this.releaseTableLock(tableId, lockValue);
        }
      }
      
      // If this is the last attempt, decide what error to throw
      if (attempt === maxRetries) {
        if (lastOperationError && this.isNonRetryableError(lastOperationError)) {
          // Throw the actual operation error if it's non-retryable
          throw lastOperationError;
        } else if (lastOperationError) {
          // Wrap the operation error with lock context
          const lockError = new Error(`Table operation failed after ${maxRetries} attempts: ${lastOperationError.message}`);
          (lockError as any).originalError = lastOperationError;
          throw lockError;
        } else {
          // Only throw generic lock error if we never got a lock
          throw new Error('Unable to acquire table lock - another operation in progress');
        }
      }
      
      // Wait before retrying
      console.log(`Table lock acquisition failed, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    // This should never be reached due to the throw above, but TypeScript requires it
    throw new Error('Unable to acquire table lock - maximum retries exceeded');
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
    // If Redis is not available, skip cleanup
    if (!redis) {
      return;
    }

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

// Run lock cleanup every 5 minutes (only if Redis is available)
if (redis) {
  setInterval(() => {
    BookingLockService.cleanupExpiredLocks();
  }, 5 * 60 * 1000);
}