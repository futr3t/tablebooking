import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../types';
import {
  getDietaryRequirements,
  searchDietaryRequirements,
  getCommonCombinations,
  createDietaryRequirement,
  updateDietaryRequirement,
  getDietaryStats
} from '../controllers/dietaryRequirements';

const router = Router();

// Public routes - no authentication required
router.get('/', getDietaryRequirements);
router.get('/search', searchDietaryRequirements);
router.get('/combinations', getCommonCombinations);

// Protected routes
router.post(
  '/',
  authenticateToken,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  createDietaryRequirement
);

router.put(
  '/:id',
  authenticateToken,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER),
  updateDietaryRequirement
);

router.get(
  '/stats/:restaurantId',
  authenticateToken,
  getDietaryStats
);

export default router;