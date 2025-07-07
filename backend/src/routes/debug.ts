import { Router } from 'express';
import { BookingLockService } from '../services/booking-lock';

const router = Router();

/**
 * Debug endpoint to check which version of BookingLockService is deployed
 */
router.get('/booking-lock-version', (req, res) => {
  try {
    // Check if the enhanced error handling method exists
    const hasEnhancedErrorHandling = typeof (BookingLockService as any).isNonRetryableError === 'function';
    
    // Get some method signatures to verify deployment
    const methods = Object.getOwnPropertyNames(BookingLockService)
      .filter(name => typeof (BookingLockService as any)[name] === 'function');
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        hasEnhancedErrorHandling,
        availableMethods: methods,
        lockTimeout: (BookingLockService as any).LOCK_TIMEOUT || 'not found',
        lockPrefix: (BookingLockService as any).LOCK_PREFIX || 'not found',
        version: hasEnhancedErrorHandling ? 'enhanced-v2' : 'basic-v1'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        timestamp: new Date().toISOString(),
        version: 'unknown'
      }
    });
  }
});

/**
 * Debug endpoint to test the actual error handling
 */
router.get('/test-lock-error', async (req, res) => {
  try {
    // Try to trigger the enhanced error handling
    const testOperation = async () => {
      throw new Error('column "test_column" of relation "test_table" does not exist');
    };
    
    await BookingLockService.withLock(
      'test-restaurant',
      '2025-07-08', 
      '18:00',
      testOperation
    );
    
    res.json({
      success: false,
      message: 'Should not reach here'
    });
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        errorMessage: error.message,
        hasOriginalError: !!(error as any).originalError,
        isNonRetryableDetected: error.message.includes('column') && error.message.includes('does not exist'),
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Debug endpoint to trace actual booking creation process
 */
router.post('/trace-booking', async (req, res) => {
  try {
    const { restaurantId, date, time, partySize } = req.body;
    
    const trace = {
      step: '',
      timestamp: new Date().toISOString(),
      success: false,
      data: {} as any,
      errors: [] as string[]
    };
    
    // Import services for testing
    const { default: RestaurantModel } = await import('../models/Restaurant');
    const { default: TableModel } = await import('../models/Table');
    const { AvailabilityService } = await import('../services/availability');
    
    trace.step = '1. Loading restaurant';
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      trace.errors.push('Restaurant not found');
      return res.json(trace);
    }
    trace.data.restaurant = { id: restaurant.id, name: restaurant.name };
    
    trace.step = '2. Getting available tables';
    const availableTables = await TableModel.findAvailableTablesForPartySize(restaurantId, partySize);
    trace.data.availableTablesCount = availableTables.length;
    
    trace.step = '3. Testing findBestTable';
    const bestTable = await AvailabilityService.findBestTable(
      restaurantId,
      date,
      time,
      partySize,
      120,
      false // guest booking
    );
    trace.data.bestTable = bestTable ? { id: bestTable.id, number: bestTable.number } : null;
    
    if (!bestTable) {
      trace.errors.push('No available table found');
      return res.json(trace);
    }
    
    trace.step = '4. Testing withLock wrapper';
    let lockError = null;
    try {
      await BookingLockService.withLock(
        restaurantId,
        date,
        time,
        async () => {
          trace.data.lockAcquired = true;
          // Don't actually create booking, just test the lock
          return { test: 'success' };
        }
      );
      trace.data.lockTest = 'passed';
    } catch (error: any) {
      lockError = error;
      trace.errors.push(`Lock failed: ${error.message}`);
      trace.data.lockError = {
        message: error.message,
        hasOriginalError: !!(error as any).originalError,
        isNonRetryable: typeof (BookingLockService as any).isNonRetryableError === 'function' ? 
          (BookingLockService as any).isNonRetryableError(error) : 'method not found'
      };
    }
    
    trace.success = !lockError;
    trace.step = trace.success ? '5. All tests passed' : '5. Lock test failed';
    
    res.json(trace);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;