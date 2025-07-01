/**
 * Public widget API routes - for embedded widgets on restaurant websites
 * These routes require API key validation but no user authentication
 */

import { Router } from 'express';
import { validateApiKey, widgetCors, widgetSecurity } from '../middleware/apiKey';
import { widgetApiRateLimit, bookingRateLimit, perApiKeyRateLimit } from '../middleware/widgetRateLimit';
import { 
  getRestaurantInfo, 
  getAvailability, 
  createBooking, 
  getBookingByConfirmation 
} from '../controllers/publicWidget';

const router = Router();

// Apply middleware to all public widget routes
router.use(widgetCors);
router.use(widgetSecurity);
router.use(perApiKeyRateLimit); // Per-API key rate limiting
router.use(validateApiKey);

// Public widget API endpoints
router.get('/restaurant-info', widgetApiRateLimit, getRestaurantInfo);
router.get('/availability', widgetApiRateLimit, getAvailability);
router.post('/booking', bookingRateLimit, createBooking); // More restrictive for bookings
router.get('/booking/:confirmationCode', widgetApiRateLimit, getBookingByConfirmation);

export default router;