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
router.post('/test-lock-error', async (req, res) => {
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

export default router;