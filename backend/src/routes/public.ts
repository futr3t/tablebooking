import { Router } from 'express';
import { 
  getRestaurantInfo, 
  getAvailability, 
  createBooking, 
  getBookingByConfirmation 
} from '../controllers/public';
import { 
  validateApiKey, 
  widgetCors, 
  widgetSecurity, 
  widgetRateLimit 
} from '../middleware/apiKey';
import { validate } from '../middleware/validation';

const router = Router();

// Apply widget-specific middleware to all routes
router.use(widgetCors);
router.use(widgetSecurity);
router.use(widgetRateLimit);

// Validation rules for public booking creation
const validatePublicBooking = validate([
  { field: 'customerName', required: true, type: 'string', minLength: 2, maxLength: 255 },
  { field: 'customerEmail', required: false, type: 'email' },
  { field: 'customerPhone', required: false, type: 'string', minLength: 10, maxLength: 20 },
  { field: 'partySize', required: true, type: 'number', min: 1, max: 20 },
  { field: 'bookingDate', required: true, type: 'date' },
  { field: 'bookingTime', required: true, type: 'time' },
  { field: 'specialRequests', required: false, type: 'string', maxLength: 500 }
]);

// Validation rules for availability check
const validateAvailabilityQuery = validate([
  { field: 'date', required: true, type: 'date' },
  { field: 'partySize', required: true, type: 'number', min: 1, max: 20 }
]);

/**
 * @route GET /api/public/restaurant-info
 * @desc Get restaurant information for widget display
 * @access Public (requires valid API key)
 * @param {string} apiKey - Restaurant API key (query param or header)
 */
router.get('/restaurant-info', validateApiKey, getRestaurantInfo);

/**
 * @route GET /api/public/availability
 * @desc Get available time slots for booking
 * @access Public (requires valid API key)
 * @param {string} apiKey - Restaurant API key (query param or header)
 * @param {string} date - Booking date (YYYY-MM-DD format)
 * @param {number} partySize - Number of guests
 */
router.get('/availability', validateApiKey, validateAvailabilityQuery, getAvailability);

/**
 * @route POST /api/public/booking
 * @desc Create a new booking through the widget
 * @access Public (requires valid API key)
 * @param {string} apiKey - Restaurant API key (query param or header)
 * @body {Object} booking - Booking details
 */
router.post('/booking', validateApiKey, validatePublicBooking, createBooking);

/**
 * @route GET /api/public/booking/:confirmationCode
 * @desc Get booking details by confirmation code
 * @access Public (requires valid API key)
 * @param {string} apiKey - Restaurant API key (query param or header)
 * @param {string} confirmationCode - Booking confirmation code
 */
router.get('/booking/:confirmationCode', validateApiKey, getBookingByConfirmation);

/**
 * @route GET /api/public/health
 * @desc Health check for public API
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;