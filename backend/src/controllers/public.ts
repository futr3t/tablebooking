import { Request, Response } from 'express';
import { WidgetConfigModel } from '../models/WidgetConfig';
import { BookingModel } from '../models/Booking';
import { availabilityService } from '../services/availability';
import { ApiResponse } from '../types';

// Extend Request type to include restaurant info from API key middleware
interface PublicRequest extends Request {
  restaurant?: any;
  widgetConfig?: any;
}

/**
 * Get restaurant information for the widget
 */
export const getRestaurantInfo = async (req: PublicRequest, res: Response) => {
  try {
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
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
export const getAvailability = async (req: PublicRequest, res: Response) => {
  try {
    const { date, partySize } = req.query;
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
    }

    // Validate required parameters
    if (!date || !partySize) {
      return res.status(400).json({
        success: false,
        error: 'Date and party size are required'
      } as ApiResponse);
    }

    // Validate party size against widget settings
    const partySizeNum = parseInt(partySize as string);
    if (partySizeNum > widgetConfig.settings.maxPartySize) {
      return res.status(400).json({
        success: false,
        error: `Party size cannot exceed ${widgetConfig.settings.maxPartySize} guests`
      } as ApiResponse);
    }

    // Get availability using existing service
    const availability = await availabilityService.getAvailableTimeSlots(
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
export const createBooking = async (req: PublicRequest, res: Response) => {
  try {
    const restaurant = req.restaurant;
    const widgetConfig = req.widgetConfig;

    if (!restaurant || !widgetConfig) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or widget not configured'
      } as ApiResponse);
    }

    const { customerName, customerEmail, customerPhone, partySize, bookingDate, bookingTime, specialRequests } = req.body;

    // Validate required fields based on widget settings
    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required'
      } as ApiResponse);
    }

    if (widgetConfig.settings.requireEmail && !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      } as ApiResponse);
    }

    if (widgetConfig.settings.requirePhone && !customerPhone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      } as ApiResponse);
    }

    // Validate party size
    if (partySize > widgetConfig.settings.maxPartySize) {
      return res.status(400).json({
        success: false,
        error: `Party size cannot exceed ${widgetConfig.settings.maxPartySize} guests`
      } as ApiResponse);
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
      return res.status(409).json({
        success: false,
        error: 'No tables available for the selected time. Please choose a different time.'
      } as ApiResponse);
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
export const getBookingByConfirmation = async (req: PublicRequest, res: Response) => {
  try {
    const { confirmationCode } = req.params;
    const restaurant = req.restaurant;

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      } as ApiResponse);
    }

    // Find booking by confirmation code and restaurant
    const booking = await BookingModel.findByConfirmationCode(confirmationCode);

    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse);
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