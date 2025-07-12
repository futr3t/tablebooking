import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { BookingTemplateModel } from '../models/BookingTemplate';
import { TableModel } from '../models/Table';
import { EnhancedAvailabilityService, EnhancedAvailabilityService as AvailabilityService } from '../services/enhanced-availability';
import { BookingLockService } from '../services/booking-lock';
import { BusinessRulesService } from '../services/businessRules';
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
  body('partySize').isInt({ min: 1, max: 100 }).withMessage('Party size must be between 1 and 100'),
  body('bookingDate').isISO8601().toDate().withMessage('Invalid booking date'),
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
  // Debug logging
  console.log('Staff booking request body:', JSON.stringify(req.body, null, 2));
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: any) => `${err.path || err.param}: ${err.msg}`).join(', ');
    console.log('Validation errors:', errorMessages);
    throw createError(`Validation failed: ${errorMessages}`, 400);
  }

  const {
    restaurantId,
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
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Validate business rules - staff bookings can override pacing but not basic rules
  const businessRulesError = await BusinessRulesService.validateBookingRequest(
    restaurantId,
    bookingDate,
    bookingTime,
    partySize,
    true, // isStaffBooking
    overridePacing
  );

  if (businessRulesError) {
    // If it's a pacing override requirement and staff wants to override, allow it
    if (businessRulesError.code === 'PACING_OVERRIDE_REQUIRED' && overridePacing) {
      if (!overrideReason || overrideReason.trim().length < 10) {
        throw createError('Override reason must be at least 10 characters', 400);
      }
      // Enhanced audit logging for override actions
      console.log(`[OVERRIDE AUDIT] ${new Date().toISOString()} - Staff override by ${req.user.email} (${req.user.role}) for restaurant ${restaurantId}`);
      console.log(`[OVERRIDE AUDIT] Booking: ${bookingDate} ${bookingTime} for ${partySize} people`);
      console.log(`[OVERRIDE AUDIT] Reason: ${overrideReason}`);
      console.log(`[OVERRIDE AUDIT] Customer: ${customerName} (${customerPhone || 'no phone'})`);
      
      // Could be enhanced to write to audit database table in the future
      // await AuditService.logOverride({
      //   userId: req.user.id,
      //   restaurantId,
      //   bookingDate,
      //   bookingTime,
      //   reason: overrideReason,
      //   customer: customerName,
      //   timestamp: new Date()
      // });
    } else {
      const error = createError(businessRulesError.message, 400);
      error.code = businessRulesError.code;
      throw error;
    }
  }

  // Check if override is requested and validate (legacy check)
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

  // Get dynamic turn time if not specified
  const bookingDuration = duration || await AvailabilityService.getTurnTimeForParty(
    restaurantId,
    partySize,
    new Date(bookingDate),
    bookingTime
  );

  // Use distributed locking to prevent double bookings
  const booking = await BookingLockService.withLock(
    restaurantId,
    bookingDate,
    bookingTime,
    async () => {
      // CRITICAL: Re-check availability within the lock to prevent race conditions
      const currentAvailability = await EnhancedAvailabilityService.getEnhancedAvailability(
        restaurantId,
        bookingDate,
        partySize,
        bookingDuration
      );

      // Find the current slot status
      const requestedSlot = currentAvailability.timeSlots.find(slot => slot.time === bookingTime);
      
      if (!requestedSlot) {
        throw createError(`Time slot ${bookingTime} is not available for booking`, 400);
      }

      // Check if the slot is still available for booking
      if (requestedSlot.pacingStatus === 'physically_full') {
        throw createError('No tables available for this time slot. Please select a different time.', 409);
      }

      // If pacing override is required but not provided, reject the booking
      if (requestedSlot.pacingStatus === 'pacing_full' && !overridePacing) {
        throw createError('This time slot exceeds capacity limits. Override is required.', 409);
      }

      // If slot is busy but no override provided, still allow but log warning
      if (requestedSlot.pacingStatus === 'busy' && !overridePacing) {
        console.log(`[BOOKING WARNING] Creating booking in busy slot without override: ${bookingDate} ${bookingTime} for ${partySize} people`);
      }

      let assignedTable = null;
      
      // If tableId is provided, verify it's still available
      if (tableId) {
        const table = await TableModel.findById(tableId);
        if (table && table.restaurantId === restaurantId && table.isActive) {
          // Check if table is available at the requested time (re-check within lock)
          const existingBookings = await BookingModel.findByDateRange(restaurantId, bookingDate, bookingDate);
          const startMinutes = AvailabilityService.timeToMinutes(bookingTime);
          const endMinutes = startMinutes + bookingDuration;
          
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
          } else {
            throw createError(`Selected table ${table.number} is no longer available for this time slot`, 409);
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
          bookingDuration,
          true // isStaffBooking = true
        );

        if (!assignedTable) {
          // Double-check if we should force to waitlist or reject
          if (requestedSlot.tablesAvailable === 0) {
            throw createError('No tables available for this time slot. Please select a different time or add to waitlist.', 409);
          }
        }
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
          duration: bookingDuration,
          notes,
          specialRequests,
          dietaryRequirements,
          occasion,
          preferredSeating,
          marketingConsent,
          source: BookingSource.STAFF,
          createdBy: req.user?.id,
          isVip,
          internalNotes,
          metadata: {
            ...(metadata || {}),
            createdByStaff: req.user?.email,
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
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
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
 * Get enhanced availability for staff with pacing indicators and suggestions
 * Uses the basic AvailabilityService and enhances the response with additional metadata
 */
export const getEnhancedAvailability = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId, date, partySize, duration, preferredTime } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !date || !partySize) {
    throw createError('Restaurant ID, date, and party size are required', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Get enhanced availability with detailed pacing information
  const enhancedAvailability = await EnhancedAvailabilityService.getEnhancedAvailability(
    restaurantId as string,
    date as string,
    parseInt(partySize as string),
    duration ? parseInt(duration as string) : undefined
  );

  // Add override risk assessment to each slot
  const enhancedTimeSlots = enhancedAvailability.timeSlots.map(slot => ({
    ...slot,
    overrideRisk: slot.pacingStatus === 'pacing_full' ? 'high' : 
                  slot.pacingStatus === 'busy' ? 'medium' : 'low',
    currentBookings: slot.tablesAvailable ? Math.max(0, 10 - slot.tablesAvailable) : 0,
    utilizationPercent: slot.pacingStatus === 'pacing_full' ? 95 : 
                       slot.pacingStatus === 'busy' ? 80 : 
                       slot.pacingStatus === 'moderate' ? 50 : 20
  }));

  const availability = {
    date: enhancedAvailability.date,
    timeSlots: enhancedTimeSlots,
    suggestions: enhancedAvailability.suggestions
  };

  res.json({
    success: true,
    data: availability
  } as ApiResponse);
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
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
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

  // Get dynamic turn time for the party size
  const turnTime = await AvailabilityService.getTurnTimeForParty(
    restaurantId as string,
    Number(partySize),
    new Date(date as string),
    time as string
  );
  
  // Check which tables are available at the specified time
  const startMinutes = AvailabilityService.timeToMinutes(time as string);
  const endMinutes = startMinutes + turnTime;

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
  const { restaurantId, dates, partySize, duration } = req.body;

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
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
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