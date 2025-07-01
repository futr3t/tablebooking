import { Router } from 'express';
import { 
  getWidgetConfig, 
  updateWidgetConfig, 
  regenerateApiKey, 
  toggleWidget,
  getInstallationInstructions 
} from '../controllers/widget';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All widget routes require authentication
router.use(authenticate);

// Validation rules for widget config updates
const validateWidgetConfig = validate([
  { field: 'isEnabled', required: false, type: 'boolean' },
  { 
    field: 'theme', 
    required: false, 
    type: 'string',
    custom: (value) => {
      if (value && typeof value === 'object') {
        const validKeys = ['primaryColor', 'secondaryColor', 'fontFamily', 'borderRadius'];
        const keys = Object.keys(value);
        return keys.every(key => validKeys.includes(key));
      }
      return true;
    }
  },
  { 
    field: 'settings', 
    required: false, 
    type: 'string',
    custom: (value) => {
      if (value && typeof value === 'object') {
        const validKeys = [
          'showAvailableSlots', 'maxPartySize', 'advanceBookingDays', 
          'requirePhone', 'requireEmail', 'showSpecialRequests', 'confirmationMessage'
        ];
        const keys = Object.keys(value);
        return keys.every(key => validKeys.includes(key));
      }
      return true;
    }
  }
]);

// Validation for toggle widget
const validateToggleWidget = validate([
  { field: 'enabled', required: true, type: 'boolean' }
]);

/**
 * @route GET /api/widget/config
 * @desc Get widget configuration for the authenticated user's restaurant
 * @access Private (requires authentication)
 */
router.get('/config', getWidgetConfig);

/**
 * @route PUT /api/widget/config
 * @desc Update widget configuration
 * @access Private (requires authentication, owner/manager role)
 */
router.put('/config', validateWidgetConfig, updateWidgetConfig);

/**
 * @route POST /api/widget/toggle
 * @desc Toggle widget enabled/disabled status
 * @access Private (requires authentication, owner/manager role)
 */
router.post('/toggle', validateToggleWidget, toggleWidget);

/**
 * @route POST /api/widget/regenerate-key
 * @desc Regenerate API key for the widget
 * @access Private (requires authentication, owner role only)
 */
router.post('/regenerate-key', regenerateApiKey);

/**
 * @route GET /api/widget/installation
 * @desc Get widget installation instructions and code
 * @access Private (requires authentication)
 */
router.get('/installation', getInstallationInstructions);

export default router;