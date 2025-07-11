import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { AvailabilityService } from '../services/availability';
import { WaitlistService } from '../services/waitlist';
import { BookingLockService } from '../services/booking-lock';
import { BusinessRulesService } from '../services/businessRules';
import { AuthRequest, ApiResponse, BookingStatus } from '../types';
import { createError, asyncHandler } from '../middleware/error';

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