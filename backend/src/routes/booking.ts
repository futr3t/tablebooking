import { Router } from 'express';
import {
  checkAvailability,
  createBooking,
  getBookings,
  getBooking,
  getBookingByConfirmation,
  updateBooking,
  cancelBooking,
  markNoShow,
  addToWaitlist,
  getWaitlist,
  // Staff booking functions (consolidated)
  createStaffBooking,
  getCustomerSuggestions,
  getEnhancedAvailability,
  getAvailableTables,
  bulkCheckAvailability,
  staffBookingValidation
} from '../controllers/booking';
import {
  authenticate,
  authorize,
  requireRestaurantAccess,
  optionalAuth
} from '../middleware/auth';
import {
  validate,
  validateBooking
} from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// Public endpoints (no authentication required)
router.get('/availability', validate([
  { field: 'restaurantId', required: true, type: 'uuid' },
  { field: 'date', required: true, type: 'date' },
  { field: 'partySize', required: true, type: 'number', min: 1, max: 20 },
  { field: 'duration', required: false, type: 'number', min: 30, max: 480 }
]), checkAvailability);

router.post('/guest', validateBooking, createBooking);

router.get('/confirmation/:confirmationCode', validate([
  { field: 'confirmationCode', required: true, type: 'string', minLength: 6, maxLength: 12 }
]), getBookingByConfirmation);

router.post('/waitlist', validate([
  { field: 'restaurantId', required: true, type: 'uuid' },
  { field: 'customerName', required: true, type: 'string', minLength: 2, maxLength: 255 },
  { field: 'customerEmail', required: false, type: 'email' },
  { field: 'customerPhone', required: false, type: 'phone' },
  { field: 'partySize', required: true, type: 'number', min: 1, max: 20 },
  { field: 'bookingDate', required: true, type: 'date' },
  { field: 'bookingTime', required: true, type: 'time' },
  { field: 'duration', required: false, type: 'number', min: 30, max: 480 },
  { field: 'specialRequests', required: false, type: 'string', maxLength: 500 }
]), addToWaitlist);

// Authenticated endpoints
router.use(authenticate);

// Staff endpoints - require restaurant access
router.get('/restaurant/:restaurantId', 
  requireRestaurantAccess,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  validate([
    { field: 'restaurantId', required: true, type: 'uuid' },
    { field: 'date', required: false, type: 'date' },
    { field: 'status', required: false, type: 'string' },
    { field: 'customerName', required: false, type: 'string' },
    { field: 'page', required: false, type: 'number', min: 1 },
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 }
  ]),
  getBookings
);

router.get('/waitlist',
  validate([
    { field: 'restaurantId', required: true, type: 'uuid' },
    { field: 'date', required: false, type: 'date' }
  ]),
  getWaitlist
);

router.post('/',
  validateBooking,
  createBooking
);

router.get('/:id',
  validate([
    { field: 'id', required: true, type: 'uuid' }
  ]),
  getBooking
);

router.put('/:id',
  validate([
    { field: 'id', required: true, type: 'uuid' },
    { field: 'customerName', required: false, type: 'string', minLength: 2, maxLength: 255 },
    { field: 'customerEmail', required: false, type: 'email' },
    { field: 'customerPhone', required: false, type: 'phone' },
    { field: 'partySize', required: false, type: 'number', min: 1, max: 20 },
    { field: 'bookingDate', required: false, type: 'date' },
    { field: 'bookingTime', required: false, type: 'time' },
    { field: 'duration', required: false, type: 'number', min: 30, max: 480 },
    { field: 'specialRequests', required: false, type: 'string', maxLength: 500 },
    { field: 'status', required: false, type: 'string' }
  ]),
  updateBooking
);

router.delete('/:id',
  validate([
    { field: 'id', required: true, type: 'uuid' }
  ]),
  cancelBooking
);

router.post('/:id/no-show',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  validate([
    { field: 'id', required: true, type: 'uuid' }
  ]),
  markNoShow
);

// ========================================
// Staff Booking Routes (consolidated from staffBooking.ts)
// ========================================

// Create staff booking with enhanced features
router.post('/staff',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  staffBookingValidation,
  createStaffBooking
);

// Get customer suggestions for auto-complete
router.get('/staff/customers/:restaurantId',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  getCustomerSuggestions
);

// Get enhanced availability with pacing indicators
router.get('/staff/availability',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST, UserRole.SERVER),
  getEnhancedAvailability
);

// Get available tables for specific time slot
router.get('/staff/tables',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  getAvailableTables
);

// Bulk check availability for multiple dates
router.post('/staff/availability/bulk',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.HOST),
  bulkCheckAvailability
);

export default router;