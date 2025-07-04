import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { BookingTemplateModel } from '../models/BookingTemplate';
import { EnhancedAvailabilityService } from '../services/enhanced-availability';
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
  body('overrideReason').optional().trim()
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
    overrideReason
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
      // Staff bookings bypass concurrent limits
      const bestTable = await EnhancedAvailabilityService.findBestTable(
        restaurantId,
        bookingDate,
        bookingTime,
        partySize,
        duration,
        true // isStaffBooking = true
      );

      if (bestTable || forceWaitlist) {
        const bookingData = {
          restaurantId,
          tableId: bestTable?.id,
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
          isWaitlisted: !bestTable
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
  const { restaurantId, date, partySize, duration, preferredTime } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  if (!restaurantId || !date || !partySize) {
    throw createError('Restaurant ID, date, and party size are required', 400);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const availability = await EnhancedAvailabilityService.getEnhancedAvailability(
    restaurantId as string,
    date as string,
    parseInt(partySize as string),
    duration ? parseInt(duration as string) : 120,
    preferredTime as string
  );

  res.json({
    success: true,
    data: availability
  } as ApiResponse);
});

/**
 * Bulk check availability for multiple dates
 */
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