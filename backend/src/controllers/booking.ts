import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { BookingTemplateModel } from '../models/BookingTemplate';
import { TableModel } from '../models/Table';
import { EnhancedAvailabilityService, EnhancedAvailabilityService as AvailabilityService } from '../services/enhanced-availability';
import { WaitlistService } from '../services/waitlist';
import { BookingLockService } from '../services/booking-lock';
import { BusinessRulesService } from '../services/businessRules';
import { AuthRequest, ApiResponse, BookingStatus, BookingSource } from '../types';
import { createError, asyncHandler } from '../middleware/error';
import { body, validationResult } from 'express-validator';

// Helper function to extract date string from Date or timestamp
const getDateString = (dateValue: any): string => {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  if (typeof dateValue === 'string') {
    return dateValue.split('T')[0];
  }
  return String(dateValue).split('T')[0];
};

export const checkAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { restaurantId, date, partySize, duration } = req.query;

  if (!restaurantId || !date || !partySize) {
    throw createError('Restaurant ID, date, and party size are required', 400);
  }

  const availability = await AvailabilityService.checkAvailability(
    restaurantId as string,
    date as string,
    parseInt(partySize as string),
    duration ? parseInt(duration as string) : undefined
  );

  res.json({
    success: true,
    data: availability
  } as ApiResponse);
});

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
    forceWaitlist = false
  } = req.body;

  // Validate required fields
  if (!restaurantId || !customerName || !partySize || !bookingDate || !bookingTime) {
    throw createError('Missing required booking information', 400);
  }

  // Determine if this is a staff booking (authenticated user) or guest booking
  const isStaffBooking = !!req.user;

  // Validate business rules before attempting to create booking
  const businessRulesError = await BusinessRulesService.validateBookingRequest(
    restaurantId,
    bookingDate,
    bookingTime,
    partySize,
    isStaffBooking,
    false // overridePacing - regular bookings don't override
  );

  if (businessRulesError) {
    const error = createError(businessRulesError.message, 400);
    error.code = businessRulesError.code;
    throw error;
  }

  // Use distributed locking to prevent double bookings
  const booking = await BookingLockService.withLock(
    restaurantId,
    bookingDate,
    bookingTime,
    async () => {
      
      // Get dynamic turn time if not specified
      const bookingDuration = duration || await AvailabilityService.getTurnTimeForParty(
        restaurantId,
        partySize,
        new Date(bookingDate),
        bookingTime
      );

      // Re-check availability within the lock
      const bestTable = await AvailabilityService.findBestTable(
        restaurantId,
        bookingDate,
        bookingTime,
        partySize,
        bookingDuration,
        isStaffBooking
      );

      if (bestTable) {
        // Create confirmed booking with table lock
        return await BookingLockService.withTableLock(bestTable.id, async () => {
          const booking = await BookingModel.create({
            restaurantId,
            tableId: bestTable.id,
            customerName,
            customerEmail,
            customerPhone,
            partySize,
            bookingDate,
            bookingTime,
            duration: bookingDuration,
            notes,
            specialRequests,
            isWaitlisted: false
          });

          // Invalidate availability cache
          await AvailabilityService.invalidateAvailabilityCache(restaurantId, bookingDate);
          
          return booking;
        });
      } else if (forceWaitlist) {
        // Add to waitlist
        return await WaitlistService.addToWaitlist({
          restaurantId,
          customerName,
          customerEmail,
          customerPhone,
          partySize,
          bookingDate,
          bookingTime,
          duration: bookingDuration,
          notes,
          specialRequests
        });
      } else {
        const errorMessage = isStaffBooking 
          ? 'No tables available for the requested time slot'
          : 'No tables available for the requested time slot. This may be due to concurrent booking limits.';
        throw createError(errorMessage, 409);
      }
    }
  );

  res.status(201).json({
    success: true,
    data: booking,
    message: booking.isWaitlisted ? 'Added to waitlist' : 'Booking confirmed'
  } as ApiResponse);
});

export const getBookings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const { date, status, customerName, page, limit, includeCancelled } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access (except for super admin)
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const result = await BookingModel.findByRestaurant(restaurantId, {
    date: date as string,
    status: status as BookingStatus,
    customerName: customerName as string,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    includeCancelled: includeCancelled === 'true'
  });

  res.json(result);
});

export const getBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const booking = await BookingModel.findById(id);
  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Check access permissions
  if (req.user) {
    if (req.user.role !== 'super_admin' && req.user.restaurantId !== booking.restaurantId) {
      throw createError('Access denied to this booking', 403);
    }
  }

  res.json({
    success: true,
    data: booking
  } as ApiResponse);
});

export const getBookingByConfirmation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { confirmationCode } = req.params;

  const booking = await BookingModel.findByConfirmationCode(confirmationCode);
  if (!booking) {
    throw createError('Booking not found', 404);
  }

  res.json({
    success: true,
    data: booking
  } as ApiResponse);
});

export const updateBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const existingBooking = await BookingModel.findById(id);
  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== existingBooking.restaurantId) {
    throw createError('Access denied to this booking', 403);
  }

  // Don't allow updates to completed or no-show bookings
  if (existingBooking.status === BookingStatus.COMPLETED || existingBooking.status === BookingStatus.NO_SHOW) {
    throw createError('Cannot update completed or no-show bookings', 400);
  }

  // If changing time/date, check availability
  if ((updates.bookingDate && updates.bookingDate !== existingBooking.bookingDate) ||
      (updates.bookingTime && updates.bookingTime !== existingBooking.bookingTime) ||
      (updates.partySize && updates.partySize !== existingBooking.partySize)) {
    
    const newDate = updates.bookingDate || existingBooking.bookingDate;
    const newTime = updates.bookingTime || existingBooking.bookingTime;
    const newPartySize = updates.partySize || existingBooking.partySize;
    const duration = updates.duration || existingBooking.duration;

    const bestTable = await AvailabilityService.findBestTable(
      existingBooking.restaurantId,
      newDate,
      newTime,
      newPartySize,
      duration
    );

    if (!bestTable) {
      throw createError('No tables available for the new time slot', 409);
    }

    updates.tableId = bestTable.id;
  }

  const updatedBooking = await BookingModel.update(id, updates);
  if (!updatedBooking) {
    throw createError('Failed to update booking', 500);
  }

  // Invalidate availability cache
  await AvailabilityService.invalidateAvailabilityCache(
    updatedBooking.restaurantId,
    getDateString(updatedBooking.bookingDate)
  );

  res.json({
    success: true,
    data: updatedBooking,
    message: 'Booking updated successfully'
  } as ApiResponse);
});

export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const booking = await BookingModel.findById(id);
  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Allow cancellation by customer (with confirmation code) or staff
  if (req.user) {
    if (req.user.role !== 'super_admin' && req.user.restaurantId !== booking.restaurantId) {
      throw createError('Access denied to this booking', 403);
    }
  }

  if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
    throw createError('Cannot cancel this booking', 400);
  }

  const cancelledBooking = await BookingModel.cancel(id);
  if (!cancelledBooking) {
    throw createError('Failed to cancel booking', 500);
  }

  // Process waitlist for the freed slot
  await WaitlistService.processWaitlistForDate(booking.restaurantId, getDateString(booking.bookingDate));

  // Invalidate availability cache
  await AvailabilityService.invalidateAvailabilityCache(booking.restaurantId, getDateString(booking.bookingDate));

  res.json({
    success: true,
    data: cancelledBooking,
    message: 'Booking cancelled successfully'
  } as ApiResponse);
});

export const markNoShow = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const booking = await BookingModel.findById(id);
  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== booking.restaurantId) {
    throw createError('Access denied to this booking', 403);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw createError('Can only mark confirmed bookings as no-show', 400);
  }

  const updatedBooking = await BookingModel.markNoShow(id);
  if (!updatedBooking) {
    throw createError('Failed to mark booking as no-show', 500);
  }

  // Process waitlist for the freed slot
  await WaitlistService.processWaitlistForDate(booking.restaurantId, getDateString(booking.bookingDate));

  // Invalidate availability cache
  await AvailabilityService.invalidateAvailabilityCache(booking.restaurantId, getDateString(booking.bookingDate));

  res.json({
    success: true,
    data: updatedBooking,
    message: 'Booking marked as no-show'
  } as ApiResponse);
});

export const addToWaitlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    specialRequests
  } = req.body;

  // Validate required fields
  if (!restaurantId || !customerName || !partySize || !bookingDate || !bookingTime) {
    throw createError('Missing required booking information', 400);
  }

  // Get dynamic turn time if not specified
  const bookingDuration = duration || await AvailabilityService.getTurnTimeForParty(
    restaurantId,
    partySize,
    new Date(bookingDate),
    bookingTime
  );

  const booking = await WaitlistService.addToWaitlist({
    restaurantId,
    customerName,
    customerEmail,
    customerPhone,
    partySize,
    bookingDate,
    bookingTime,
    duration: bookingDuration,
    notes,
    specialRequests
  });

  res.status(201).json({
    success: true,
    data: booking,
    message: 'Added to waitlist successfully'
  } as ApiResponse);
});

export const getWaitlist = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId, date } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId) {
    throw createError('Restaurant ID is required', 400);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const waitlist = await WaitlistService.getWaitlistForDate(
    restaurantId as string,
    date as string
  );

  res.json({
    success: true,
    data: waitlist
  } as ApiResponse);
});

// ========================================
// Staff Booking Functions (merged from staffBooking.ts)
// ========================================

/**
 * Staff booking validation rules
 */
export const staffBookingValidation = [
  body('restaurantId').isUUID().withMessage('Invalid restaurant ID'),
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerPhone').optional().custom((value) => {
    // Allow empty string or null for optional phone
    if (!value || value === '' || value === null) return true;
    // Validate phone format if provided
    return /^[\d\s\-\+\(\)\.]+$/.test(value);
  }).withMessage('Invalid phone number format'),
  body('customerEmail').optional().custom((value) => {
    // Allow empty string or null for optional email
    if (!value || value === '' || value === null) return true;
    // Validate email format if provided
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }).withMessage('Invalid email address'),
  body('partySize').isInt({ min: 1, max: 100 }).withMessage('Party size must be between 1 and 100'),
  body('bookingDate').custom((value) => {
    // Accept ISO date string or Date object
    const date = new Date(value);
    return !isNaN(date.getTime());
  }).withMessage('Invalid booking date'),
  body('bookingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('duration').optional().custom((value) => {
    // Allow empty/null or valid integer
    if (!value || value === '' || value === null) return true;
    const num = parseInt(value);
    return Number.isInteger(num) && num >= 30 && num <= 480;
  }).withMessage('Duration must be between 30 and 480 minutes'),
  body('dietaryRequirements').optional().trim(),
  body('allergens').optional().trim(),
  body('occasion').optional().trim(),
  body('seatingPreference').optional().trim(),
  body('vipCustomer').optional().custom((value) => {
    // Allow boolean, string 'true'/'false', or empty
    if (value === '' || value === null || value === undefined) return true;
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }),
  body('marketingConsent').optional().custom((value) => {
    // Allow boolean, string 'true'/'false', or empty
    if (value === '' || value === null || value === undefined) return true;
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }),
  body('internalNotes').optional().trim(),
  body('overridePacing').optional().custom((value) => {
    // Allow boolean, string 'true'/'false', or empty
    if (value === '' || value === null || value === undefined) return true;
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }),
  body('overrideReason').optional().trim()
];

/**
 * Create a staff booking with enhanced features
 */
export const createStaffBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Enhanced debugging
  console.log('=== STAFF BOOKING REQUEST DEBUG ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    console.log('Failed fields:', errors.array().map(e => `${e.param}: ${e.msg} (value: ${e.value})`));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      })),
      debug: {
        receivedBody: req.body,
        requiredFields: ['restaurantId', 'customerName', 'partySize', 'bookingDate', 'bookingTime']
      }
    });
    return;
  }
  
  console.log('✅ Validation passed, proceeding with booking...');

  const {
    restaurantId,
    customerName,
    customerPhone,
    customerEmail,
    partySize,
    bookingDate,
    bookingTime,
    duration,
    dietaryRequirements,
    allergens,
    occasion,
    seatingPreference,
    vipCustomer,
    marketingConsent,
    internalNotes,
    overridePacing,
    overrideReason
  } = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
    throw createError('Access denied to this restaurant', 403);
  }

  const date = new Date(bookingDate);
  const dateString = date.toISOString().split('T')[0];

  // Validate business rules (staff bookings can override some rules)
  const businessRulesError = await BusinessRulesService.validateBookingRequest(
    restaurantId,
    dateString,
    bookingTime,
    partySize,
    true, // isStaffBooking
    overridePacing || false
  );

  if (businessRulesError && !overridePacing) {
    throw createError(businessRulesError.message, 400);
  }

  // Use withLock like regular booking (handles Redis unavailability in production)
  const booking = await BookingLockService.withLock(
    restaurantId,
    dateString,
    bookingTime,
    async () => {
      // Check if override is needed and validate
      if (overridePacing) {
        if (!overrideReason || overrideReason.trim().length < 5) {
          throw createError('Override reason must be at least 5 characters', 400);
        }

        const overrideCheck = await EnhancedAvailabilityService.canOverridePacing(
          restaurantId,
          dateString,
          bookingTime,
          partySize,
          overrideReason
        );

        if (!overrideCheck.canOverride) {
          throw createError('Cannot override booking for this time slot', 400);
        }
      }

      // Get appropriate turn time for this party size if duration not specified
      const bookingDuration = duration || await AvailabilityService.getTurnTimeForParty(
        restaurantId,
        partySize,
        date,
        bookingTime
      );

      let assignedTable = null;

      // If not overriding, check normal availability
      if (!overridePacing) {
        const currentAvailability = await EnhancedAvailabilityService.getEnhancedAvailability(
          restaurantId,
          dateString,
          partySize,
          bookingDuration,
          bookingTime
        );

        const selectedSlot = currentAvailability.timeSlots.find(slot => slot.time === bookingTime);
        if (!selectedSlot) {
          throw createError('Time slot not available', 400);
        }

        if (selectedSlot.pacingStatus === 'physically_full') {
          throw createError('No tables physically available for this time slot', 400);
        }

        // If busy or pacing_full, require override
        if ((selectedSlot.pacingStatus === 'busy' || selectedSlot.pacingStatus === 'pacing_full') && !overridePacing) {
          throw createError('This time slot requires override due to high demand', 400);
        }
      }

      // Check for conflicting bookings in a wider time window
      const existingBookings = await BookingModel.findByDateRange(restaurantId, dateString, dateString);
      const bookingStart = date;
      bookingStart.setHours(parseInt(bookingTime.split(':')[0]), parseInt(bookingTime.split(':')[1]), 0, 0);
      const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

      // Check for conflicts with existing bookings
      const conflictingBookings = existingBookings.filter(booking => {
        if (booking.status === 'cancelled' || booking.status === 'no_show') {
          return false;
        }

        const existingStart = new Date(booking.bookingDate);
        if (booking.bookingTime) {
          const startMinutes = AvailabilityService.timeToMinutes(bookingTime);
          existingStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        }

        const existingEnd = new Date(existingStart.getTime() + (booking.duration || 120) * 60000);

        // Check for overlapping bookings for the same customer
        if (booking.customerPhone === customerPhone || booking.customerEmail === customerEmail) {
          const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
          const requestedMinutes = AvailabilityService.timeToMinutes(bookingTime);
          const timeDiff = Math.abs(bookingMinutes - requestedMinutes);
          
          // Flag if bookings are within 2 hours of each other
          if (timeDiff <= 120) {
            return true;
          }
        }

        return false;
      });

      if (conflictingBookings.length > 0) {
        throw createError('Customer already has a booking around this time', 400);
      }

      // Find best available table
      if (!overridePacing) {
        assignedTable = await EnhancedAvailabilityService.findBestTable(
          restaurantId,
          dateString,
          bookingTime,
          partySize,
          bookingDuration,
          true // isStaffBooking
        );

        if (!assignedTable) {
          throw createError('No suitable tables available', 400);
        }
      }

      // Create the booking
      const newBooking = await BookingModel.create({
        restaurantId,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        partySize,
        bookingDate: date,
        bookingTime,
        duration: bookingDuration,
        status: BookingStatus.CONFIRMED,
        source: BookingSource.STAFF,
        assignedTableId: assignedTable?.id || null,
        dietaryRequirements: dietaryRequirements || null,
        allergens: allergens || null,
        occasion: occasion || null,
        seatingPreference: seatingPreference || null,
        vipCustomer: vipCustomer || false,
        marketingConsent: marketingConsent || false,
        internalNotes: internalNotes || null,
        overridePacing: overridePacing || false,
        overrideReason: overrideReason || null,
        createdBy: req.user.id
      });

      // Create booking template for future auto-complete if customer provided contact info
      if (customerPhone || customerEmail) {
        await BookingTemplateModel.createFromBooking(newBooking);
      }

      // Invalidate availability cache
      await EnhancedAvailabilityService.invalidateAvailabilityCache(restaurantId, dateString);

      return {
        ...newBooking,
        assignedTable: assignedTable
      };
    }
  );

  res.status(201).json({
    success: true,
    data: booking,
    message: 'Staff booking created successfully'
  } as ApiResponse);
});

/**
 * Get customer suggestions for auto-complete
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

  const enhancedAvailability = await EnhancedAvailabilityService.getEnhancedAvailability(
    restaurantId as string,
    date as string,
    parseInt(partySize as string),
    duration ? parseInt(duration as string) : undefined,
    preferredTime as string
  );

  res.json({
    success: true,
    data: enhancedAvailability
  } as ApiResponse);
});

/**
 * Get available tables for a specific time slot
 */
export const getAvailableTables = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId, date, time, partySize, duration } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !date || !time || !partySize) {
    throw createError('Restaurant ID, date, time, and party size are required', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
    throw createError('Access denied to this restaurant', 403);
  }

  const turnTime = await AvailabilityService.getTurnTimeForParty(
    restaurantId as string,
    parseInt(partySize as string),
    new Date(date as string),
    time as string
  );

  const startMinutes = AvailabilityService.timeToMinutes(time as string);
  
  // Get existing bookings for this date
  const existingBookings = await BookingModel.findByDateRange(
    restaurantId as string,
    date as string,
    date as string
  );

  // Filter out cancelled and no-show bookings
  const activeBookings = existingBookings.filter(booking => 
    booking.status !== 'cancelled' && booking.status !== 'no_show'
  );

  // Check for conflicts within the duration window
  const conflictingBookings = activeBookings.filter(booking => {
    const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
    const bookingDuration = booking.duration || 120;
    const bookingEndMinutes = bookingMinutes + bookingDuration;
    const requestEndMinutes = startMinutes + (duration ? parseInt(duration as string) : turnTime);

    // Check for time overlap
    return !(bookingEndMinutes <= startMinutes || bookingMinutes >= requestEndMinutes);
  });

  // Get all restaurant tables
  const allTables = await TableModel.findByRestaurantId(restaurantId as string);
  
  // Filter tables that can accommodate the party size
  const suitableTables = allTables.filter(table => 
    table.minCapacity <= parseInt(partySize as string) && 
    table.maxCapacity >= parseInt(partySize as string)
  );

  // Filter out tables that are booked during the requested time
  const occupiedTableIds = conflictingBookings
    .map(booking => booking.assignedTableId)
    .filter(id => id !== null);

  const availableTables = suitableTables.filter(table => 
    !occupiedTableIds.includes(table.id)
  );

  res.json({
    success: true,
    data: {
      availableTables,
      conflictingBookings: conflictingBookings.length,
      totalSuitableTables: suitableTables.length
    }
  } as ApiResponse);
});

/**
 * Bulk check availability for multiple dates
 */
export const bulkCheckAvailability = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId, dates, partySize, duration } = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !dates || !Array.isArray(dates) || !partySize) {
    throw createError('Restaurant ID, dates array, and party size are required', 400);
  }

  if (dates.length > 7) {
    throw createError('Maximum 7 dates allowed for bulk check', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
    throw createError('Access denied to this restaurant', 403);
  }

  const results = [];

  for (const date of dates) {
    try {
      const availability = await EnhancedAvailabilityService.checkAvailability(
        restaurantId,
        date,
        parseInt(partySize),
        duration ? parseInt(duration) : undefined
      );

      results.push({
        date,
        success: true,
        timeSlots: availability.timeSlots
      });
    } catch (error: any) {
      results.push({
        date,
        success: false,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    data: results
  } as ApiResponse);
});