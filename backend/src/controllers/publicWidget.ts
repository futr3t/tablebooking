/**
 * Public widget API controllers - no authentication required
 * These endpoints are used by the embedded widget on restaurant websites
 */

import { Request, Response } from 'express';
import { WidgetConfigModel } from '../models/WidgetConfig';
import { BookingModel } from '../models/Booking';
import { EnhancedAvailabilityService as AvailabilityService } from '../services/enhanced-availability';
import { ApiResponse } from '../types';

interface WidgetRequest extends Request {
  widgetConfig?: any;
  restaurant?: any;
}

/**
 * Get restaurant information and widget configuration using API key
 */
export const getRestaurantInfo = async (req: WidgetRequest, res: Response): Promise<void> => {
  try {
    const { widgetConfig, restaurant } = req;

    if (!widgetConfig.isEnabled) {
      res.status(403).json({
        success: false,
        error: 'Widget is currently disabled'
      } as ApiResponse);
      return;
    }

    // Return public restaurant info and widget theme/settings
    res.json({
      success: true,
      data: {
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        cuisine: restaurant.cuisine,
        description: restaurant.description,
        openingHours: restaurant.openingHours,
        bookingSettings: {
          maxPartySize: widgetConfig.settings.maxPartySize || restaurant.bookingSettings.maxPartySize,
          advanceBookingDays: widgetConfig.settings.advanceBookingDays || restaurant.bookingSettings.maxAdvanceBookingDays,
          minBookingHours: widgetConfig.settings.minBookingHours || restaurant.bookingSettings.minAdvanceBookingHours,
          requireEmail: widgetConfig.settings.requireEmail,
          requirePhone: widgetConfig.settings.requirePhone,
          showSpecialRequests: widgetConfig.settings.showSpecialRequests
        },
        theme: widgetConfig.theme
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting restaurant info for widget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load restaurant information'
    } as ApiResponse);
  }
};

/**
 * Get availability for a specific date and party size
 */
export const getAvailability = async (req: WidgetRequest, res: Response): Promise<void> => {
  try {
    const { restaurant } = req;
    const { date, partySize } = req.query;

    if (!date || !partySize) {
      res.status(400).json({
        success: false,
        error: 'Date and party size are required'
      } as ApiResponse);
      return;
    }

    const parsedPartySize = parseInt(partySize as string);
    if (isNaN(parsedPartySize) || parsedPartySize < 1 || parsedPartySize > 50) {
      res.status(400).json({
        success: false,
        error: 'Invalid party size'
      } as ApiResponse);
      return;
    }

    const availability = await AvailabilityService.checkAvailability(
      restaurant.id,
      date as string,
      parsedPartySize
    );

    res.json({
      success: true,
      data: availability
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting availability for widget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    } as ApiResponse);
  }
};

/**
 * Create a new booking via widget
 */
export const createBooking = async (req: WidgetRequest, res: Response): Promise<void> => {
  try {
    const { restaurant, widgetConfig } = req;
    const {
      customerName,
      customerEmail,
      customerPhone,
      partySize,
      bookingDate,
      bookingTime,
      specialRequests
    } = req.body;

    // Validate required fields
    if (!customerName || !partySize || !bookingDate || !bookingTime) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: customerName, partySize, bookingDate, bookingTime'
      } as ApiResponse);
      return;
    }

    // Validate widget-specific requirements
    if (widgetConfig.settings.requireEmail && !customerEmail) {
      res.status(400).json({
        success: false,
        error: 'Email is required for bookings'
      } as ApiResponse);
      return;
    }

    if (widgetConfig.settings.requirePhone && !customerPhone) {
      res.status(400).json({
        success: false,
        error: 'Phone number is required for bookings'
      } as ApiResponse);
      return;
    }

    // Validate party size
    const maxPartySize = widgetConfig.settings.maxPartySize || restaurant.bookingSettings.maxPartySize;
    if (partySize > maxPartySize) {
      res.status(400).json({
        success: false,
        error: `Party size cannot exceed ${maxPartySize} people`
      } as ApiResponse);
      return;
    }

    // Create booking
    const booking = await BookingModel.create({
      restaurantId: restaurant.id,
      customerName: customerName,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      partySize: parseInt(partySize),
      bookingDate: bookingDate,
      bookingTime: bookingTime,
      specialRequests: specialRequests || undefined
    });

    res.status(201).json({
      success: true,
      data: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        customerName: booking.customerName,
        partySize: booking.partySize,
        bookingDate,
        bookingTime,
        status: booking.status
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Error creating booking via widget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    } as ApiResponse);
  }
};

/**
 * Get booking details by confirmation code
 */
export const getBookingByConfirmation = async (req: WidgetRequest, res: Response): Promise<void> => {
  try {
    const { restaurant } = req;
    const { confirmationCode } = req.params;

    if (!confirmationCode) {
      res.status(400).json({
        success: false,
        error: 'Confirmation code is required'
      } as ApiResponse);
      return;
    }

    const booking = await BookingModel.findByConfirmationCode(confirmationCode);

    if (!booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        partySize: booking.partySize,
        bookingTime: booking.bookingTime,
        specialRequests: booking.specialRequests,
        status: booking.status,
        createdAt: booking.createdAt
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting booking by confirmation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking details'
    } as ApiResponse);
  }
};