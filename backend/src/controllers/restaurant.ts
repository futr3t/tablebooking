import { Request, Response } from 'express';
import { RestaurantModel } from '../models/Restaurant';
import { AuthRequest, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/error';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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
      dateFormat: restaurant.dateFormat,
      defaultSlotDuration: restaurant.defaultSlotDuration || 30,
      openingHours: restaurant.openingHours,
      bookingSettings: restaurant.bookingSettings
    }
  } as ApiResponse);
});

export const updateRestaurantSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const updates = req.body;

  console.log('updateRestaurantSettings called with:', {
    restaurantId,
    body: req.body,
    bodyKeys: Object.keys(req.body)
  });

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


  if (updates.defaultSlotDuration !== undefined && (updates.defaultSlotDuration < 15 || updates.defaultSlotDuration > 120)) {
    throw createError('Slot duration must be between 15 and 120 minutes', 400);
  }

  if (updates.dateFormat !== undefined && !['uk', 'us'].includes(updates.dateFormat)) {
    throw createError('Date format must be either "uk" or "us"', 400);
  }

  // Validate opening hours if provided
  if (updates.openingHours) {
    const { openingHours } = updates;
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of daysOfWeek) {
      if (openingHours[day]) {
        const daySchedule = openingHours[day];
        
        // Validate periods structure if using new format
        if (daySchedule.periods && Array.isArray(daySchedule.periods)) {
          for (let i = 0; i < daySchedule.periods.length; i++) {
            const period = daySchedule.periods[i];
            // Allow empty name but provide default if not present
            if (!period.name) {
              period.name = `Service ${i + 1}`;
            }
            if (!period.startTime || !period.endTime) {
              throw createError(`Start time and end time are required for ${day} period ${i + 1}`, 400);
            }
            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(period.startTime) || !timeRegex.test(period.endTime)) {
              throw createError(`Invalid time format for ${day} period ${i + 1}. Use HH:MM format`, 400);
            }
          }
        }
        // Validate simple format if using old format
        else if (daySchedule.isOpen && (daySchedule.openTime || daySchedule.closeTime)) {
          // Only validate times if the day is marked as open and has time fields
          if (daySchedule.openTime && daySchedule.closeTime) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(daySchedule.openTime) || !timeRegex.test(daySchedule.closeTime)) {
              throw createError(`Invalid time format for ${day}. Use HH:MM format`, 400);
            }
          } else if (daySchedule.isOpen) {
            throw createError(`Open time and close time are required for ${day} when marked as open`, 400);
          }
        }
      }
    }
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

  // Update restaurant directly - these fields are actual columns, not in bookingSettings
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
      dateFormat: updatedRestaurant.dateFormat,
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

// Get all restaurants (super admin only)
export const getAllRestaurants = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'super_admin') {
    throw createError('Access denied. Super admin privileges required', 403);
  }

  const { page = '1', limit = '10', search = '', isActive } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build filters
  const filters: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Active status filter
  if (isActive !== undefined) {
    filters.push(`is_active = $${paramIndex++}`);
    params.push(isActive === 'true');
  }

  // Search filter
  if (search) {
    const searchParam = `%${search.toString().toLowerCase()}%`;
    filters.push(`(
      LOWER(name) LIKE $${paramIndex} OR 
      LOWER(email) LIKE $${paramIndex} OR 
      phone LIKE $${paramIndex} OR
      LOWER(address) LIKE $${paramIndex}
    )`);
    params.push(searchParam);
    paramIndex++;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM restaurants ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  params.push(limitNum, offset);
  const result = await db.query(
    `SELECT r.*, 
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT b.id) as active_bookings
     FROM restaurants r
     LEFT JOIN users u ON r.id = u.restaurant_id AND u.is_active = true
     LEFT JOIN bookings b ON r.id = b.restaurant_id 
       AND b.status IN ('pending', 'confirmed') 
       AND b.booking_date >= CURRENT_DATE
     ${whereClause}
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const restaurants = result.rows.map(row => ({
    ...RestaurantModel.mapFromDb(row),
    userCount: parseInt(row.user_count, 10),
    activeBookings: parseInt(row.active_bookings, 10)
  }));

  res.json({
    success: true,
    data: {
      items: restaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum)
      }
    },
    message: 'Restaurants retrieved successfully'
  } as ApiResponse);
});

// Create new restaurant (super admin only)
export const createRestaurant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'super_admin') {
    throw createError('Access denied. Super admin privileges required', 403);
  }

  const {
    name,
    email,
    phone,
    address,
    cuisine,
    description,
    maxCovers = 100,
    timeZone = 'UTC',
    dateFormat = 'uk',
    defaultSlotDuration = 30,
    openingHours,
    bookingSettings
  } = req.body;

  // Check if restaurant with same email exists
  const existingResult = await db.query(
    'SELECT id FROM restaurants WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingResult.rows.length > 0) {
    throw createError('Restaurant with this email already exists', 409);
  }

  // Create default opening hours if not provided
  const defaultOpeningHours = openingHours || {
    monday: { isOpen: false },
    tuesday: { isOpen: false },
    wednesday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
    thursday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
    friday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
    saturday: { isOpen: true, openTime: '17:00', closeTime: '21:00' },
    sunday: { isOpen: true, openTime: '12:00', closeTime: '21:00' }
  };

  // Create default booking settings if not provided
  const defaultBookingSettings = bookingSettings || {
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2,
    maxPartySize: 10,
    slotDuration: 30,
    bufferTimeBefore: 0,
    bufferTimeAfter: 15,
    requirePhoneNumber: false,
    requireEmail: false,
    allowGuestBookings: true,
    sendConfirmationEmail: true,
    sendReminderEmail: true,
    reminderHours: 24,
    enableWaitlist: true,
    maxConcurrentTables: 0,
    maxConcurrentCovers: 0
  };

  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO restaurants (
      id, name, email, phone, address, cuisine, description,
      max_covers, time_zone, date_format, default_slot_duration,
      opening_hours, booking_settings
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      id,
      name,
      email.toLowerCase(),
      phone,
      address,
      cuisine,
      description,
      maxCovers,
      timeZone,
      dateFormat,
      defaultSlotDuration,
      JSON.stringify(defaultOpeningHours),
      JSON.stringify(defaultBookingSettings)
    ]
  );

  const newRestaurant = RestaurantModel.mapFromDb(result.rows[0]);

  res.status(201).json({
    success: true,
    data: newRestaurant,
    message: 'Restaurant created successfully'
  } as ApiResponse);
});

// Update restaurant (super admin and restaurant owners)
export const updateRestaurant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  // Check permissions
  if (user.role !== 'super_admin') {
    if (user.role !== 'owner' || user.restaurantId !== id) {
      throw createError('Access denied', 403);
    }
  }

  const restaurant = await RestaurantModel.findById(id);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  // Update restaurant
  const updatedRestaurant = await RestaurantModel.update(id, req.body);
  if (!updatedRestaurant) {
    throw createError('Failed to update restaurant', 500);
  }

  res.json({
    success: true,
    data: updatedRestaurant,
    message: 'Restaurant updated successfully'
  } as ApiResponse);
});

// Delete restaurant (super admin only)
export const deleteRestaurant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'super_admin') {
    throw createError('Access denied. Super admin privileges required', 403);
  }

  const { id } = req.params;

  const restaurant = await RestaurantModel.findById(id);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  // Check for active bookings
  const bookingResult = await db.query(
    `SELECT COUNT(*) FROM bookings 
     WHERE restaurant_id = $1 
     AND status IN ('pending', 'confirmed') 
     AND booking_date >= CURRENT_DATE`,
    [id]
  );

  const activeBookings = parseInt(bookingResult.rows[0].count, 10);
  if (activeBookings > 0) {
    throw createError(`Cannot delete restaurant with ${activeBookings} active bookings`, 400);
  }

  // Soft delete
  await db.query(
    'UPDATE restaurants SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    message: 'Restaurant deleted successfully'
  } as ApiResponse);
});

// Switch user's active restaurant (for super admins and owners with multiple restaurants)
export const switchRestaurant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { restaurantId } = req.body;

  if (!restaurantId) {
    throw createError('Restaurant ID is required', 400);
  }

  // Verify restaurant exists
  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  // Check permissions
  if (user.role !== 'super_admin') {
    // For non-super admins, check if they have access to this restaurant
    // This would require implementing a many-to-many relationship between users and restaurants
    // For now, only allow switching to their assigned restaurant
    if (user.restaurantId !== restaurantId) {
      throw createError('Access denied to this restaurant', 403);
    }
  }

  // In a real implementation, this would update the user's session or JWT token
  // For now, we'll just return the restaurant info
  res.json({
    success: true,
    data: {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    },
    message: 'Restaurant switched successfully'
  } as ApiResponse);
});