import express from 'express';
import { requireAuth, requireRole, requireOwnerOrManager } from '../middleware/auth';
import { 
  getAllUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/user';
import { validateUserCreate, validateUserUpdate } from '../middleware/validation';
import { UserRole } from '../types';

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// Get all users - managers and above can view users
router.get('/', requireOwnerOrManager, getAllUsers);

// Get single user - managers and above can view, users can view themselves
router.get('/:id', requireAuth, getUser);

// Create new user - owners and above can create users
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER), validateUserCreate, createUser);

// Update user - users can update themselves, managers can update their restaurant's users
router.put('/:id', requireAuth, validateUserUpdate, updateUser);

// Delete user - owners and above can delete users
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.OWNER), deleteUser);

export default router;