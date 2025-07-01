import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  getWidgetConfig, 
  updateWidgetConfig, 
  regenerateApiKey, 
  toggleWidget, 
  getInstallationInstructions 
} from '../controllers/widget';

const router = Router();

// Note: Widget.js and demo page are served from widget-embedded.ts routes

// Widget configuration API endpoints (full database-backed implementation)
router.get('/config', requireAuth, getWidgetConfig);
router.put('/config', requireAuth, updateWidgetConfig);
router.post('/api-key/regenerate', requireAuth, regenerateApiKey);
router.put('/toggle', requireAuth, toggleWidget);
router.get('/installation', requireAuth, getInstallationInstructions);

export default router;