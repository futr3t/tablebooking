import { Request, Response } from 'express';
import { RestaurantModel } from '../models/Restaurant';
import { AuthRequest, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/error';

export const getRestaurantSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  // Return restaurant settings
  res.json({
    success: true,
    data: {
      id: restaurant.id,
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      cuisine: restaurant.cuisine,
      description: restaurant.description,
      maxCovers: restaurant.maxCovers,
      timeZone: restaurant.timeZone,
      turnTimeMinutes: restaurant.turnTimeMinutes,
      defaultSlotDuration: restaurant.defaultSlotDuration,
      openingHours: restaurant.openingHours,
      bookingSettings: restaurant.bookingSettings
    }
  } as ApiResponse);
});

export const updateRestaurantSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const updates = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access - only owners and managers can update settings
  if (req.user.role !== 'super_admin' && req.user.role !== 'owner' && req.user.role !== 'manager') {
    throw createError('Insufficient permissions to update restaurant settings', 403);
  }

  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  // Validate updates
  if (updates.maxCovers !== undefined && updates.maxCovers < 0) {
    throw createError('Maximum covers must be non-negative', 400);
  }

  if (updates.turnTimeMinutes !== undefined && (updates.turnTimeMinutes < 30 || updates.turnTimeMinutes > 480)) {
    throw createError('Turn time must be between 30 and 480 minutes', 400);
  }

  if (updates.defaultSlotDuration !== undefined && (updates.defaultSlotDuration < 15 || updates.defaultSlotDuration > 120)) {
    throw createError('Slot duration must be between 15 and 120 minutes', 400);
  }

  // Validate booking settings if provided
  if (updates.bookingSettings) {
    const { bookingSettings } = updates;
    
    if (bookingSettings.maxAdvanceBookingDays !== undefined && (bookingSettings.maxAdvanceBookingDays < 1 || bookingSettings.maxAdvanceBookingDays > 365)) {
      throw createError('Max advance booking days must be between 1 and 365', 400);
    }

    if (bookingSettings.minAdvanceBookingHours !== undefined && (bookingSettings.minAdvanceBookingHours < 0 || bookingSettings.minAdvanceBookingHours > 168)) {
      throw createError('Min advance booking hours must be between 0 and 168 (1 week)', 400);
    }

    if (bookingSettings.maxPartySize !== undefined && (bookingSettings.maxPartySize < 1 || bookingSettings.maxPartySize > 50)) {
      throw createError('Max party size must be between 1 and 50', 400);
    }

    if (bookingSettings.slotDuration !== undefined && (bookingSettings.slotDuration < 15 || bookingSettings.slotDuration > 120)) {
      throw createError('Slot duration must be between 15 and 120 minutes', 400);
    }

    if (bookingSettings.maxConcurrentTables !== undefined && bookingSettings.maxConcurrentTables < 0) {
      throw createError('Max concurrent tables must be non-negative', 400);
    }

    if (bookingSettings.maxConcurrentCovers !== undefined && bookingSettings.maxConcurrentCovers < 0) {
      throw createError('Max concurrent covers must be non-negative', 400);
    }

    if (bookingSettings.reminderHours !== undefined && (bookingSettings.reminderHours < 0 || bookingSettings.reminderHours > 72)) {
      throw createError('Reminder hours must be between 0 and 72', 400);
    }
  }

  // Update restaurant
  const updatedRestaurant = await RestaurantModel.update(restaurantId, updates);
  if (!updatedRestaurant) {
    throw createError('Failed to update restaurant settings', 500);
  }

  res.json({
    success: true,
    data: {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      email: updatedRestaurant.email,
      phone: updatedRestaurant.phone,
      address: updatedRestaurant.address,
      cuisine: updatedRestaurant.cuisine,
      description: updatedRestaurant.description,
      maxCovers: updatedRestaurant.maxCovers,
      timeZone: updatedRestaurant.timeZone,
      turnTimeMinutes: updatedRestaurant.turnTimeMinutes,
      defaultSlotDuration: updatedRestaurant.defaultSlotDuration,
      openingHours: updatedRestaurant.openingHours,
      bookingSettings: updatedRestaurant.bookingSettings
    },
    message: 'Restaurant settings updated successfully'
  } as ApiResponse);
});

export const getRestaurant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  res.json({
    success: true,
    data: restaurant
  } as ApiResponse);
});