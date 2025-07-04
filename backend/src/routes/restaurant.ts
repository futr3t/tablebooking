import { Router } from 'express';
import { authenticate, authorize, requireRestaurantAccess } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import {
  getRestaurant,
  getRestaurantSettings,
  updateRestaurantSettings
} from '../controllers/restaurant';

const router = Router();

// All restaurant routes require authentication
router.use(authenticate);

// Get restaurant details
router.get('/:restaurantId',
  requireRestaurantAccess,
  validate([
    { field: 'restaurantId', required: true, type: 'uuid' }
  ]),
  getRestaurant
);

// Get restaurant settings
router.get('/:restaurantId/settings',
  requireRestaurantAccess,
  validate([
    { field: 'restaurantId', required: true, type: 'uuid' }
  ]),
  getRestaurantSettings
);

// Update restaurant settings (only owners and managers)
router.put('/:restaurantId/settings',
  authorize(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  requireRestaurantAccess,
  validate([
    { field: 'restaurantId', required: true, type: 'uuid' },
    { field: 'name', required: false, type: 'string', minLength: 1, maxLength: 255 },
    { field: 'email', required: false, type: 'email' },
    { field: 'phone', required: false, type: 'string', minLength: 10, maxLength: 20 },
    { field: 'address', required: false, type: 'string', minLength: 1, maxLength: 1000 },
    { field: 'cuisine', required: false, type: 'string', maxLength: 100 },
    { field: 'description', required: false, type: 'string', maxLength: 1000 },
    { field: 'maxCovers', required: false, type: 'number', min: 0 },
    { field: 'timeZone', required: false, type: 'string', maxLength: 50 },
    { field: 'turnTimeMinutes', required: false, type: 'number', min: 30, max: 480 },
    { field: 'defaultSlotDuration', required: false, type: 'number', min: 15, max: 120 }
    // openingHours and bookingSettings validation handled in controller
  ]),
  updateRestaurantSettings
);

export default router;