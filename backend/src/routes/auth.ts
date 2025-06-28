import { Router } from 'express';
import {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken
} from '../controllers/auth';
import {
  authenticate,
  optionalAuth
} from '../middleware/auth';
import {
  validateLogin,
  validateRegister,
  validate
} from '../middleware/validation';
import { authRateLimitMiddleware } from '../middleware/security';

const router = Router();

router.post('/login', authRateLimitMiddleware, validateLogin, login);
router.post('/register', authRateLimitMiddleware, validateRegister, register);
router.post('/logout', logout);

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate([
  { field: 'firstName', required: false, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'lastName', required: false, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'phone', required: false, type: 'phone' }
]), updateProfile);

router.put('/password', authenticate, validate([
  { field: 'currentPassword', required: true, type: 'string' },
  { field: 'newPassword', required: true, type: 'string', minLength: 8 }
]), changePassword);

router.post('/refresh', authenticate, refreshToken);

export default router;