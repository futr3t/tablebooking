import { Request, Response } from 'express';
import { TurnTimeRuleModel } from '../models/TurnTimeRule';
import { AuthRequest, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/error';
import { body, validationResult } from 'express-validator';

/**
 * Validation rules for turn time rules
 */
export const turnTimeRuleValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('minPartySize').isInt({ min: 1 }).withMessage('Minimum party size must be at least 1'),
  body('maxPartySize').isInt({ min: 1 }).withMessage('Maximum party size must be at least 1'),
  body('turnTimeMinutes').isInt({ min: 30, max: 480 }).withMessage('Turn time must be between 30 and 480 minutes'),
  body('description').optional().trim(),
  body('priority').optional().isInt({ min: 0 }).withMessage('Priority must be non-negative')
];

/**
 * Get all turn time rules for a restaurant
 */
export const getTurnTimeRules = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const rules = await TurnTimeRuleModel.findByRestaurant(restaurantId);

  res.json({
    success: true,
    data: rules
  } as ApiResponse);
});

/**
 * Get a single turn time rule
 */
export const getTurnTimeRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const rule = await TurnTimeRuleModel.findById(id);
  if (!rule) {
    throw createError('Turn time rule not found', 404);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== rule.restaurantId) {
    throw createError('Access denied to this turn time rule', 403);
  }

  res.json({
    success: true,
    data: rule
  } as ApiResponse);
});

/**
 * Create a new turn time rule
 */
export const createTurnTimeRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access - only owners and managers can create rules
  if (req.user.role !== 'super_admin' && req.user.role !== 'owner' && req.user.role !== 'manager') {
    throw createError('Insufficient permissions to create turn time rules', 403);
  }

  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: any) => `${err.path || err.param}: ${err.msg}`).join(', ');
    throw createError(`Validation failed: ${errorMessages}`, 400);
  }

  const { minPartySize, maxPartySize } = req.body;

  // Validate party size range
  if (minPartySize > maxPartySize) {
    throw createError('Minimum party size cannot be greater than maximum party size', 400);
  }

  // Check for overlapping rules
  const existingRules = await TurnTimeRuleModel.findByRestaurant(restaurantId);
  const hasOverlap = existingRules.some(rule => 
    !(maxPartySize < rule.minPartySize || minPartySize > rule.maxPartySize)
  );

  if (hasOverlap) {
    throw createError('Party size range overlaps with existing rules', 400);
  }

  const rule = await TurnTimeRuleModel.create({
    restaurantId,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: rule,
    message: 'Turn time rule created successfully'
  } as ApiResponse);
});

/**
 * Update a turn time rule
 */
export const updateTurnTimeRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const existingRule = await TurnTimeRuleModel.findById(id);
  if (!existingRule) {
    throw createError('Turn time rule not found', 404);
  }

  // Check restaurant access - only owners and managers can update rules
  if (req.user.role !== 'super_admin' && req.user.role !== 'owner' && req.user.role !== 'manager') {
    throw createError('Insufficient permissions to update turn time rules', 403);
  }

  if (req.user.role !== 'super_admin' && req.user.restaurantId !== existingRule.restaurantId) {
    throw createError('Access denied to this turn time rule', 403);
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: any) => `${err.path || err.param}: ${err.msg}`).join(', ');
    throw createError(`Validation failed: ${errorMessages}`, 400);
  }

  const { minPartySize, maxPartySize } = req.body;

  // If party size range is being updated, validate it
  if (minPartySize !== undefined || maxPartySize !== undefined) {
    const newMin = minPartySize !== undefined ? minPartySize : existingRule.minPartySize;
    const newMax = maxPartySize !== undefined ? maxPartySize : existingRule.maxPartySize;

    if (newMin > newMax) {
      throw createError('Minimum party size cannot be greater than maximum party size', 400);
    }

    // Check for overlapping rules (excluding the current rule)
    const otherRules = await TurnTimeRuleModel.findByRestaurant(existingRule.restaurantId);
    const hasOverlap = otherRules.some(rule => 
      rule.id !== id && !(newMax < rule.minPartySize || newMin > rule.maxPartySize)
    );

    if (hasOverlap) {
      throw createError('Party size range overlaps with existing rules', 400);
    }
  }

  const updatedRule = await TurnTimeRuleModel.update(id, req.body);

  res.json({
    success: true,
    data: updatedRule,
    message: 'Turn time rule updated successfully'
  } as ApiResponse);
});

/**
 * Delete a turn time rule
 */
export const deleteTurnTimeRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const rule = await TurnTimeRuleModel.findById(id);
  if (!rule) {
    throw createError('Turn time rule not found', 404);
  }

  // Check restaurant access - only owners and managers can delete rules
  if (req.user.role !== 'super_admin' && req.user.role !== 'owner' && req.user.role !== 'manager') {
    throw createError('Insufficient permissions to delete turn time rules', 403);
  }

  if (req.user.role !== 'super_admin' && req.user.restaurantId !== rule.restaurantId) {
    throw createError('Access denied to this turn time rule', 403);
  }

  const success = await TurnTimeRuleModel.delete(id);
  if (!success) {
    throw createError('Failed to delete turn time rule', 500);
  }

  res.json({
    success: true,
    message: 'Turn time rule deleted successfully'
  } as ApiResponse);
});