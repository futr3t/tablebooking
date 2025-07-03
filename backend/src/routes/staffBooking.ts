import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createStaffBooking,
  getCustomerSuggestions,
  getEnhancedAvailability,
  bulkCheckAvailability,
  staffBookingValidation
} from '../controllers/staffBooking';

const router = Router();

// All staff booking routes require authentication
router.use(authenticateToken);

// Create booking with enhanced features
router.post(
  '/',
  requireRole(['super_admin', 'owner', 'manager', 'host']),
  staffBookingValidation,
  createStaffBooking
);

// Get customer suggestions for auto-complete
router.get(
  '/customers/:restaurantId',
  requireRole(['super_admin', 'owner', 'manager', 'host', 'server']),
  getCustomerSuggestions
);

// Get enhanced availability with pacing information
router.get(
  '/availability',
  requireRole(['super_admin', 'owner', 'manager', 'host', 'server']),
  getEnhancedAvailability
);

// Bulk check availability for multiple dates
router.post(
  '/availability/bulk',
  requireRole(['super_admin', 'owner', 'manager', 'host']),
  bulkCheckAvailability
);

export default router;