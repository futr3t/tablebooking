interface LockEntry {
  value: string;
  expiry: number;
  timestamp: number;
}

export class BookingLockService {
  private static readonly LOCK_TIMEOUT = 10000; // 10 seconds in milliseconds
  private static readonly LOCK_PREFIX = 'booking-lock:';
  private static readonly locks = new Map<string, LockEntry>();

  static async acquireLock(
    restaurantId: string,
    date: string,
    time: string,
    tableId?: string
  ): Promise<string | null> {
    try {
      const lockKey = this.generateLockKey(restaurantId, date, time, tableId);
      const lockValue = this.generateLockValue();
      const now = Date.now();
      const expiry = now + this.LOCK_TIMEOUT;

      // Clean up expired locks first
      this.cleanupExpiredLock(lockKey);

      // Check if lock already exists and is not expired
      const existingLock = this.locks.get(lockKey);
      if (existingLock && existingLock.expiry > now) {
        return null; // Lock already held
      }

      // Acquire the lock
      this.locks.set(lockKey, {
        value: lockValue,
        expiry: expiry,
        timestamp: now
      });

      return lockValue;
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
      const existingLock = this.locks.get(lockKey);

      // Only release if we own the lock
      if (existingLock && existingLock.value === lockValue) {
        this.locks.delete(lockKey);
        return true;
      }

      return false;
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
      const existingLock = this.locks.get(lockKey);

      // Only extend if we own the lock
      if (existingLock && existingLock.value === lockValue) {
        existingLock.expiry = Date.now() + this.LOCK_TIMEOUT;
        return true;
      }

      return false;
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
    try {
      const lockKey = `${this.LOCK_PREFIX}table:${tableId}`;
      const lockValue = this.generateLockValue();
      const now = Date.now();
      const expiry = now + this.LOCK_TIMEOUT;

      // Clean up expired locks first
      this.cleanupExpiredLock(lockKey);

      // Check if lock already exists and is not expired
      const existingLock = this.locks.get(lockKey);
      if (existingLock && existingLock.expiry > now) {
        return null; // Lock already held
      }

      // Acquire the lock
      this.locks.set(lockKey, {
        value: lockValue,
        expiry: expiry,
        timestamp: now
      });

      return lockValue;
    } catch (error) {
      console.error('Error acquiring table lock:', error);
      return null;
    }
  }

  static async releaseTableLock(tableId: string, lockValue: string): Promise<boolean> {
    try {
      const lockKey = `${this.LOCK_PREFIX}table:${tableId}`;
      const existingLock = this.locks.get(lockKey);

      // Only release if we own the lock
      if (existingLock && existingLock.value === lockValue) {
        this.locks.delete(lockKey);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error releasing table lock:', error);
      return false;
    }
  }

  static async withTableLock<T>(
    tableId: string,
    operation: () => Promise<T>
  ): Promise<T> {
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

  private static cleanupExpiredLock(lockKey: string): void {
    const lock = this.locks.get(lockKey);
    if (lock && lock.expiry <= Date.now()) {
      this.locks.delete(lockKey);
    }
  }

  static async cleanupExpiredLocks(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Find all expired locks
      for (const [key, lock] of this.locks.entries()) {
        if (lock.expiry <= now) {
          expiredKeys.push(key);
        }
      }

      // Remove expired locks
      for (const key of expiredKeys) {
        this.locks.delete(key);
      }

      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired booking locks`);
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }

  static getLockStats(): { total: number; active: number; expired: number } {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const lock of this.locks.values()) {
      if (lock.expiry > now) {
        active++;
      } else {
        expired++;
      }
    }

    return {
      total: this.locks.size,
      active,
      expired
    };
  }
}

// Run lock cleanup every 30 seconds
setInterval(() => {
  BookingLockService.cleanupExpiredLocks();
}, 30 * 1000);