import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createStaffBooking,
  getCustomerSuggestions,
  getEnhancedAvailability,
  bulkCheckAvailability,
  getAvailableTables,
  staffBookingValidation
} from '../controllers/staffBooking';

const router = Router();

// All staff booking routes require authentication
router.use(authenticateToken);

// Create booking with enhanced features
router.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  staffBookingValidation,
  createStaffBooking
);

// Get customer suggestions for auto-complete
router.get(
  '/customers/:restaurantId',
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  getCustomerSuggestions
);

// Get enhanced availability with pacing information
router.get(
  '/availability',
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  getEnhancedAvailability
);

// Bulk check availability for multiple dates
router.post(
  '/availability/bulk',
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  bulkCheckAvailability
);

// Get available tables for a specific time slot
router.get(
  '/tables/available',
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  getAvailableTables
);

export default router;