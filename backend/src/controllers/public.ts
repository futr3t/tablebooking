import { Request, Response } from 'express';
import { WidgetConfigModel } from '../models/WidgetConfig';
import { BookingModel } from '../models/Booking';
import { EnhancedAvailabilityService as AvailabilityService } from '../services/enhanced-availability';
import { ApiResponse } from '../types';

// Extend Request type to include restaurant info from API key middleware
interface PublicRequest extends Request {
  restaurant?: any;
  widgetConfig?: any;
}

/**
 * Get restaurant information for the widget
 */
export const getRestaurantInfo = async (req: PublicRequest, res: Response): Promise<void> => {
  try {
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
      return;
    }

    // Return sanitized restaurant info for public consumption
    const publicRestaurantInfo = {
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      description: restaurant.description,
      phone: restaurant.phone,
      address: restaurant.address,
      openingHours: restaurant.opening_hours,
      bookingSettings: {
        maxPartySize: widgetConfig.settings.maxPartySize,
        advanceBookingDays: widgetConfig.settings.advanceBookingDays,
        requirePhone: widgetConfig.settings.requirePhone,
        requireEmail: widgetConfig.settings.requireEmail,
        showSpecialRequests: widgetConfig.settings.showSpecialRequests
      },
      theme: widgetConfig.theme
    };

    res.json({
      success: true,
      data: publicRestaurantInfo
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting restaurant info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Get available time slots for booking
 */
export const getAvailability = async (req: PublicRequest, res: Response): Promise<void> => {
  try {
    const { date, partySize } = req.query;
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
      return;
    }

    // Validate required parameters
    if (!date || !partySize) {
      res.status(400).json({
        success: false,
        error: 'Date and party size are required'
      } as ApiResponse);
      return;
    }

    // Validate party size against widget settings
    const partySizeNum = parseInt(partySize as string);
    if (partySizeNum > widgetConfig.settings.maxPartySize) {
      res.status(400).json({
        success: false,
        error: `Party size cannot exceed ${widgetConfig.settings.maxPartySize} guests`
      } as ApiResponse);
      return;
    }

    // Get availability using existing service
    const availability = await AvailabilityService.checkAvailability(
      restaurant.id,
      date as string,
      partySizeNum
    );

    res.json({
      success: true,
      data: availability
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Create a new booking through the widget
 */
export const createBooking = async (req: PublicRequest, res: Response): Promise<void> => {
  try {
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
      return;
    }

    const { customerName, customerEmail, customerPhone, partySize, bookingDate, bookingTime, specialRequests } = req.body;

    // Validate required fields based on widget settings
    if (!customerName) {
      res.status(400).json({
        success: false,
        error: 'Customer name is required'
      } as ApiResponse);
      return;
    }

    if (widgetConfig.settings.requireEmail && !customerEmail) {
      res.status(400).json({
        success: false,
        error: 'Email is required'
      } as ApiResponse);
      return;
    }

    if (widgetConfig.settings.requirePhone && !customerPhone) {
      res.status(400).json({
        success: false,
        error: 'Phone number is required'
      } as ApiResponse);
      return;
    }

    // Validate party size
    if (partySize > widgetConfig.settings.maxPartySize) {
      res.status(400).json({
        success: false,
        error: `Party size cannot exceed ${widgetConfig.settings.maxPartySize} guests`
      } as ApiResponse);
      return;
    }

    // Create booking data
    const bookingData = {
      restaurantId: restaurant.id,
      customerName,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      partySize,
      bookingDate,
      bookingTime: `${bookingDate} ${bookingTime}`,
      specialRequests: specialRequests || null,
      status: 'pending' as const
    };

    // Create the booking
    const booking = await BookingModel.create(bookingData);

    // Return booking confirmation
    res.status(201).json({
      success: true,
      data: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        customerName: booking.customerName,
        partySize: booking.partySize,
        bookingTime: booking.bookingTime,
        status: booking.status,
        message: widgetConfig.settings.confirmationMessage
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle specific errors
    if (error.message?.includes('No suitable table found')) {
      res.status(409).json({
        success: false,
        error: 'No tables available for the selected time. Please choose a different time.'
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};

/**
 * Get booking details by confirmation code
 */
export const getBookingByConfirmation = async (req: PublicRequest, res: Response): Promise<void> => {
  try {
    const { confirmationCode } = req.params;
    const restaurant = req.restaurant;

    if (!restaurant) {
      res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      } as ApiResponse);
      return;
    }

    // Find booking by confirmation code and restaurant
    const booking = await BookingModel.findByConfirmationCode(confirmationCode);

    if (!booking || booking.restaurantId !== restaurant.id) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse);
      return;
    }

    // Return sanitized booking info
    const publicBookingInfo = {
      confirmationCode: booking.confirmationCode,
      customerName: booking.customerName,
      partySize: booking.partySize,
      bookingTime: booking.bookingTime,
      status: booking.status,
      specialRequests: booking.specialRequests
    };

    res.json({
      success: true,
      data: publicBookingInfo
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting booking by confirmation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};