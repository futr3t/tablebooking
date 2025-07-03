import { Request, Response } from 'express';
import { DietaryRequirementModel } from '../models/DietaryRequirement';
import { AuthRequest, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/error';

/**
 * Get all dietary requirements
 */
export const getDietaryRequirements = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category } = req.query;

  let requirements;
  if (category) {
    requirements = await DietaryRequirementModel.findByCategory(category as string);
  } else {
    requirements = await DietaryRequirementModel.findAll();
  }

  res.json({
    success: true,
    data: requirements
  } as ApiResponse);
});

/**
 * Search dietary requirements
 */
export const searchDietaryRequirements = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;

  if (!q || (q as string).length < 2) {
    throw createError('Search query must be at least 2 characters', 400);
  }

  const requirements = await DietaryRequirementModel.search(q as string);

  res.json({
    success: true,
    data: requirements
  } as ApiResponse);
});

/**
 * Get common dietary requirement combinations
 */
export const getCommonCombinations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Common combinations that restaurants often see
  const combinations = [
    {
      name: 'Gluten Free & Dairy Free',
      requirements: ['Gluten Intolerance/Celiac', 'Dairy Allergy'],
      description: 'Common combination for guests with multiple intolerances'
    },
    {
      name: 'Vegan & Gluten Free',
      requirements: ['Vegan', 'Gluten Intolerance/Celiac'],
      description: 'Plant-based diet without gluten'
    },
    {
      name: 'Nut Allergies',
      requirements: ['Peanut Allergy', 'Tree Nut Allergy'],
      description: 'All nut allergies combined'
    },
    {
      name: 'Shellfish & Fish Allergies',
      requirements: ['Shellfish Allergy', 'Fish Allergy'],
      description: 'All seafood allergies'
    },
    {
      name: 'Multiple Food Allergies',
      requirements: ['Dairy Allergy', 'Egg Allergy', 'Gluten Intolerance/Celiac'],
      description: 'Common multiple allergy combination'
    }
  ];

  res.json({
    success: true,
    data: combinations
  } as ApiResponse);
});

/**
 * Create custom dietary requirement (staff only)
 */
export const createDietaryRequirement = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !['super_admin', 'owner', 'manager'].includes(req.user.role)) {
    throw createError('Insufficient permissions', 403);
  }

  const {
    name,
    category,
    description,
    commonIngredients,
    severity
  } = req.body;

  if (!name || !category) {
    throw createError('Name and category are required', 400);
  }

  const requirement = await DietaryRequirementModel.create({
    name,
    category,
    description,
    commonIngredients,
    severity,
    isActive: true
  });

  res.status(201).json({
    success: true,
    data: requirement,
    message: 'Dietary requirement created successfully'
  } as ApiResponse);
});

/**
 * Update dietary requirement (staff only)
 */
export const updateDietaryRequirement = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || !['super_admin', 'owner', 'manager'].includes(req.user.role)) {
    throw createError('Insufficient permissions', 403);
  }

  const { id } = req.params;
  const updates = req.body;

  const requirement = await DietaryRequirementModel.update(id, updates);
  if (!requirement) {
    throw createError('Dietary requirement not found', 404);
  }

  res.json({
    success: true,
    data: requirement,
    message: 'Dietary requirement updated successfully'
  } as ApiResponse);
});

/**
 * Get dietary requirement statistics
 */
export const getDietaryStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const { restaurantId } = req.params;

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  // This would query bookings to find most common dietary requirements
  // For now, return mock data
  const stats = {
    mostCommon: [
      { name: 'Gluten Intolerance/Celiac', count: 145, percentage: 12.5 },
      { name: 'Vegetarian', count: 89, percentage: 7.7 },
      { name: 'Vegan', count: 67, percentage: 5.8 },
      { name: 'Peanut Allergy', count: 45, percentage: 3.9 },
      { name: 'Dairy Allergy', count: 34, percentage: 2.9 }
    ],
    byCategory: {
      allergy: 124,
      intolerance: 178,
      preference: 156,
      religious: 23
    },
    trends: {
      increasing: ['Vegan', 'Gluten Intolerance/Celiac'],
      decreasing: [],
      stable: ['Vegetarian', 'Peanut Allergy']
    }
  };

  res.json({
    success: true,
    data: stats
  } as ApiResponse);
});