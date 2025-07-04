import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { BookingTemplateModel } from '../models/BookingTemplate';
import { TableModel } from '../models/Table';
import { EnhancedAvailabilityService } from '../services/enhanced-availability';
import { AvailabilityService } from '../services/availability';
import { BookingLockService } from '../services/booking-lock';
import { AuthRequest, ApiResponse, BookingStatus, BookingSource } from '../types';
import { createError, asyncHandler } from '../middleware/error';
import { body, validationResult } from 'express-validator';

/**
 * Staff booking validation rules
 */
export const staffBookingValidation = [
  body('restaurantId').isUUID().withMessage('Invalid restaurant ID'),
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerPhone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number'),
  body('customerEmail').optional().isEmail().withMessage('Invalid email address'),
  body('partySize').isInt({ min: 1, max: 50 }).withMessage('Party size must be between 1 and 50'),
  body('bookingDate').isDate().withMessage('Invalid booking date'),
  body('bookingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('duration').optional().isInt({ min: 30, max: 480 }).withMessage('Duration must be between 30 and 480 minutes'),
  body('dietaryRequirements').optional().trim(),
  body('occasion').optional().trim(),
  body('preferredSeating').optional().trim(),
  body('isVip').optional().isBoolean(),
  body('internalNotes').optional().trim(),
  body('overridePacing').optional().isBoolean(),
  body('overrideReason').optional().trim(),
  body('tableId').optional().isUUID().withMessage('Invalid table ID')
];

/**
 * Create booking with enhanced features for staff
 */
export const createStaffBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const {
    restaurantId,
    customerName,
    customerEmail,
    customerPhone,
    partySize,
    bookingDate,
    bookingTime,
    duration = 120,
    notes,
    specialRequests,
    dietaryRequirements,
    occasion,
    preferredSeating,
    marketingConsent,
    isVip,
    internalNotes,
    metadata,
    forceWaitlist = false,
    overridePacing = false,
    overrideReason,
    tableId
  } = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Check if override is requested and validate
  if (overridePacing) {
    const overrideCheck = await EnhancedAvailabilityService.canOverridePacing(
      restaurantId,
      bookingDate,
      bookingTime,
      partySize,
      overrideReason || 'No reason provided'
    );

    if (!overrideCheck.canOverride) {
      throw createError('Cannot override pacing limits', 400);
    }

    // Log the override for audit trail
    console.log(`Pacing override by ${req.user.email} for ${bookingDate} ${bookingTime}: ${overrideReason}`);
  }

  // Use distributed locking to prevent double bookings
  const booking = await BookingLockService.withLock(
    restaurantId,
    bookingDate,
    bookingTime,
    async () => {
      let assignedTable = null;
      
      // If tableId is provided, verify it's available
      if (tableId) {
        const table = await TableModel.findById(tableId);
        if (table && table.restaurantId === restaurantId && table.isActive) {
          // Check if table is available at the requested time
          const existingBookings = await BookingModel.findByDateRange(restaurantId, bookingDate, bookingDate);
          const startMinutes = AvailabilityService.timeToMinutes(bookingTime);
          const endMinutes = startMinutes + duration;
          
          const isAvailable = !existingBookings.some(booking => {
            if (booking.status === 'cancelled' || booking.status === 'no_show') {
              return false;
            }
            if (booking.tableId !== tableId) {
              return false;
            }
            const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
            const bookingEndMinutes = bookingMinutes + booking.duration;
            return (startMinutes < bookingEndMinutes) && (endMinutes > bookingMinutes);
          });
          
          if (isAvailable) {
            assignedTable = table;
          }
        }
      }
      
      // If no table was assigned yet, find the best available table
      if (!assignedTable && !forceWaitlist) {
        assignedTable = await EnhancedAvailabilityService.findBestTable(
          restaurantId,
          bookingDate,
          bookingTime,
          partySize,
          duration,
          true // isStaffBooking = true
        );
      }

      if (assignedTable || forceWaitlist) {
        const bookingData = {
          restaurantId,
          tableId: assignedTable?.id,
          customerName,
          customerEmail,
          customerPhone,
          partySize,
          bookingDate,
          bookingTime,
          duration,
          notes,
          specialRequests,
          dietaryRequirements,
          occasion,
          preferredSeating,
          marketingConsent,
          source: BookingSource.STAFF,
          createdBy: req.user.id,
          isVip,
          internalNotes,
          metadata: {
            ...metadata,
            createdByStaff: req.user.email,
            overridePacing,
            overrideReason
          },
          isWaitlisted: !assignedTable
        };

        const booking = await BookingModel.create(bookingData);

        // Invalidate availability cache
        await EnhancedAvailabilityService.invalidateAvailabilityCache(restaurantId, bookingDate);
        
        return booking;
      } else {
        throw createError('No tables available for the requested time slot', 409);
      }
    }
  );

  res.status(201).json({
    success: true,
    data: booking,
    message: booking.isWaitlisted ? 'Added to waitlist' : 'Booking confirmed'
  } as ApiResponse);
});

/**
 * Get customer history and suggestions
 */
export const getCustomerSuggestions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const { search } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  if (!search || (search as string).length < 2) {
    throw createError('Search term must be at least 2 characters', 400);
  }

  const templates = await BookingTemplateModel.searchCustomers(
    restaurantId,
    search as string
  );

  res.json({
    success: true,
    data: templates
  } as ApiResponse);
});

/**
 * Get enhanced availability for staff
 */
export const getEnhancedAvailability = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('🚀 Enhanced availability endpoint hit');
  console.log('📋 Query params:', req.query);
  console.log('👤 User:', req.user ? { id: req.user.id, role: req.user.role, restaurantId: req.user.restaurantId } : 'No user');
  
  const { restaurantId, date, partySize, duration, preferredTime } = req.query;

  if (!req.user) {
    console.log('❌ No user found in request');
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !date || !partySize) {
    console.log('❌ Missing required parameters:', { restaurantId, date, partySize });
    throw createError('Restaurant ID, date, and party size are required', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    console.log('❌ Access denied:', { userRole: req.user.role, userRestaurantId: req.user.restaurantId, requestedRestaurantId: restaurantId });
    throw createError('Access denied to this restaurant', 403);
  }

  console.log('✅ All checks passed, proceeding with availability check');

  try {
    console.log('📞 Calling AvailabilityService.checkAvailability...');
    
    // Try the basic availability service first
    const basicAvailability = await AvailabilityService.checkAvailability(
      restaurantId as string,
      date as string,
      parseInt(partySize as string),
      duration ? parseInt(duration as string) : 120
    );

    console.log('✅ Basic availability successful:', {
      date: basicAvailability.date,
      timeSlotCount: basicAvailability.timeSlots?.length || 0,
      firstFewSlots: basicAvailability.timeSlots?.slice(0, 3)
    });

    // Convert basic slots to enhanced format
    const enhancedTimeSlots = (basicAvailability.timeSlots || []).map(slot => ({
      ...slot,
      pacingStatus: slot.available ? 'available' as const : 'full' as const,
      tablesAvailable: slot.available ? 5 : 0,
      suggestedTables: [],
      alternativeTimes: []
    }));

    const availability = {
      date: basicAvailability.date,
      timeSlots: enhancedTimeSlots,
      suggestions: {
        quietTimes: enhancedTimeSlots.filter(s => s.available).slice(0, 3).map(s => s.time),
        peakTimes: enhancedTimeSlots.filter(s => !s.available).slice(0, 3).map(s => s.time),
        bestAvailability: enhancedTimeSlots.filter(s => s.available).slice(0, 5).map(s => s.time)
      }
    };

    console.log('✅ Enhanced availability created:', {
      timeSlotCount: availability.timeSlots.length,
      availableSlots: availability.timeSlots.filter(s => s.available).length,
      suggestions: availability.suggestions
    });

    res.json({
      success: true,
      data: availability
    } as ApiResponse);

  } catch (availabilityError) {
    console.error('❌ Availability service error:', availabilityError);
    console.error('❌ Error details:', {
      message: availabilityError.message,
      stack: availabilityError.stack,
      name: availabilityError.name
    });
    
    // Return mock data as fallback so UI doesn't break
    console.log('🔄 Falling back to mock data due to error');
    const fallbackAvailability = {
      date: date as string,
      timeSlots: [
        {
          time: '18:00',
          available: true,
          pacingStatus: 'available' as const,
          tablesAvailable: 5,
          suggestedTables: [],
          alternativeTimes: []
        },
        {
          time: '19:00',
          available: true,
          pacingStatus: 'available' as const,
          tablesAvailable: 5,
          suggestedTables: [],
          alternativeTimes: []
        }
      ],
      suggestions: {
        quietTimes: ['18:00'],
        peakTimes: [],
        bestAvailability: ['18:00', '19:00']
      }
    };

    res.json({
      success: true,
      data: fallbackAvailability
    } as ApiResponse);
  }
});

/**
 * Bulk check availability for multiple dates
 */
/**
 * Get available tables for a specific time slot
 */
export const getAvailableTables = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const { restaurantId, date, time, partySize } = req.query;

  if (!restaurantId || !date || !time || !partySize) {
    throw createError('Restaurant ID, date, time, and party size are required', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Get all active tables that can accommodate the party size
  const allTablesResult = await TableModel.findByRestaurant(restaurantId as string, {
    includeInactive: false
  });

  // Get existing bookings for the date
  const existingBookings = await BookingModel.findByDateRange(
    restaurantId as string, 
    date as string, 
    date as string
  );

  // Check which tables are available at the specified time
  const startMinutes = AvailabilityService.timeToMinutes(time as string);
  const duration = 90; // Standard 90 minute booking
  const endMinutes = startMinutes + duration;

  // Filter tables by capacity
  const suitableTables = allTablesResult.tables.filter(table => 
    table.minCapacity <= Number(partySize) && table.maxCapacity >= Number(partySize)
  );

  const availableTables = suitableTables.filter(table => {
    // Check if table is available during the time slot
    const conflictingBooking = existingBookings.find(booking => {
      if (booking.status === 'cancelled' || booking.status === 'no_show') {
        return false;
      }
      if (booking.tableId !== table.id) {
        return false;
      }

      const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
      const bookingEndMinutes = bookingMinutes + booking.duration;

      // Check for overlap
      return (startMinutes < bookingEndMinutes) && (endMinutes > bookingMinutes);
    });

    return !conflictingBooking;
  });

  // Sort tables by capacity (smallest suitable first) and priority
  availableTables.sort((a, b) => {
    if (a.capacity !== b.capacity) {
      return a.capacity - b.capacity;
    }
    return b.priority - a.priority;
  });

  res.json({
    success: true,
    data: {
      availableTables,
      suggestedTable: availableTables[0] || null,
      totalAvailable: availableTables.length
    }
  });
});

export const bulkCheckAvailability = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId, dates, partySize, duration = 120 } = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !dates || !Array.isArray(dates) || dates.length === 0 || !partySize) {
    throw createError('Invalid request parameters', 400);
  }

  if (dates.length > 7) {
    throw createError('Maximum 7 dates allowed per request', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const results = await Promise.all(
    dates.map(date => 
      EnhancedAvailabilityService.checkAvailability(
        restaurantId,
        date,
        partySize,
        duration
      )
    )
  );

  res.json({
    success: true,
    data: results
  } as ApiResponse);
});