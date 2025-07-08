import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTurnTimeRules,
  getTurnTimeRule,
  createTurnTimeRule,
  updateTurnTimeRule,
  deleteTurnTimeRule,
  turnTimeRuleValidation
} from '../controllers/turnTimeRules';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all turn time rules for a restaurant
router.get('/restaurant/:restaurantId', getTurnTimeRules);

// Get a single turn time rule
router.get('/:id', getTurnTimeRule);

// Create a new turn time rule
router.post('/restaurant/:restaurantId', turnTimeRuleValidation, createTurnTimeRule);

// Update a turn time rule
router.put('/:id', turnTimeRuleValidation, updateTurnTimeRule);

// Delete a turn time rule
router.delete('/:id', deleteTurnTimeRule);

export default router;