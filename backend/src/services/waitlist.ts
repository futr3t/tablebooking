import { BookingModel } from '../models/Booking';
import { RestaurantModel } from '../models/Restaurant';
import { AvailabilityService } from './availability';
import { Booking, BookingStatus } from '../types';

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

export class WaitlistService {
  static async addToWaitlist(waitlistData: {
    restaurantId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    partySize: number;
    bookingDate: string;
    bookingTime: string;
    duration?: number;
    notes?: string;
    specialRequests?: string;
  }): Promise<Booking> {
    try {
      // Check if restaurant allows waitlist
      const restaurant = await RestaurantModel.findById(waitlistData.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const bookingSettings = restaurant.bookingSettings;
      if (!bookingSettings.enableWaitlist) {
        throw new Error('Waitlist is not enabled for this restaurant');
      }

      // Create waitlisted booking
      const booking = await BookingModel.create({
        ...waitlistData,
        isWaitlisted: true
      });

      return booking;
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw error;
    }
  }

  static async processWaitlistForDate(restaurantId: string, date: string): Promise<void> {
    try {
      // Get all waitlisted bookings for the date, ordered by waitlist position
      const waitlistBookings = await this.getWaitlistForDate(restaurantId, date);

      for (const booking of waitlistBookings) {
        const availability = await AvailabilityService.checkAvailability(
          restaurantId,
          getDateString(booking.bookingDate),
          booking.partySize,
          booking.duration
        );

        // Find an available slot for the waitlisted booking
        const availableSlot = availability.timeSlots.find(slot => 
          slot.available && slot.time === booking.bookingTime
        );

        if (availableSlot && availableSlot.tableId) {
          // Convert waitlisted booking to confirmed booking
          await BookingModel.update(booking.id, {
            tableId: availableSlot.tableId,
            isWaitlisted: false,
            waitlistPosition: undefined,
            status: BookingStatus.CONFIRMED
          });

          // Update waitlist positions for remaining bookings
          await this.updateWaitlistPositions(restaurantId, date, booking.waitlistPosition!);

          // Invalidate availability cache
          // No cache invalidation needed - removed Redis dependency

          // Send notification (TODO: implement notification service)
          await this.sendWaitlistNotification(booking);
        }
      }
    } catch (error) {
      console.error('Error processing waitlist:', error);
      throw error;
    }
  }

  static async getWaitlistForDate(restaurantId: string, date: string): Promise<Booking[]> {
    try {
      const result = await BookingModel.findByDateRange(restaurantId, date, date, true);
      return result.filter(booking => booking.isWaitlisted)
        .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
    } catch (error) {
      console.error('Error getting waitlist for date:', error);
      throw error;
    }
  }

  static async getWaitlistPosition(bookingId: string): Promise<number | null> {
    try {
      const booking = await BookingModel.findById(bookingId);
      if (!booking || !booking.isWaitlisted) {
        return null;
      }

      return booking.waitlistPosition || null;
    } catch (error) {
      console.error('Error getting waitlist position:', error);
      return null;
    }
  }

  static async removeFromWaitlist(bookingId: string): Promise<boolean> {
    try {
      const booking = await BookingModel.findById(bookingId);
      if (!booking || !booking.isWaitlisted) {
        return false;
      }

      // Cancel the waitlisted booking
      await BookingModel.cancel(bookingId);

      // Update waitlist positions for remaining bookings
      if (booking.waitlistPosition) {
        await this.updateWaitlistPositions(
          booking.restaurantId,
          getDateString(booking.bookingDate),
          booking.waitlistPosition
        );
      }

      return true;
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      return false;
    }
  }

  static async getWaitlistStats(restaurantId: string, date?: string): Promise<{
    totalWaitlisted: number;
    averageWaitTime: number;
    conversionRate: number;
  }> {
    try {
      // This is a simplified implementation
      // In a real system, you'd want to track historical data
      
      let dateFilter = '';
      let params = [restaurantId];
      
      if (date) {
        dateFilter = 'AND booking_date = $2';
        params.push(date);
      }

      // Get waitlist statistics (placeholder implementation)
      return {
        totalWaitlisted: 0,
        averageWaitTime: 0,
        conversionRate: 0
      };
    } catch (error) {
      console.error('Error getting waitlist stats:', error);
      throw error;
    }
  }

  private static async updateWaitlistPositions(
    restaurantId: string,
    date: string,
    removedPosition: number
  ): Promise<void> {
    try {
      // Update positions for all bookings after the removed one
      const waitlistBookings = await this.getWaitlistForDate(restaurantId, date);
      
      for (const booking of waitlistBookings) {
        if (booking.waitlistPosition && booking.waitlistPosition > removedPosition) {
          await BookingModel.update(booking.id, {
            waitlistPosition: booking.waitlistPosition - 1
          });
        }
      }
    } catch (error) {
      console.error('Error updating waitlist positions:', error);
      throw error;
    }
  }

  private static async sendWaitlistNotification(booking: Booking): Promise<void> {
    try {
      // TODO: Implement notification service
      // This would send email/SMS to customer about table availability
      console.log(`Sending waitlist notification to ${booking.customerName} for booking ${booking.id}`);
    } catch (error) {
      console.error('Error sending waitlist notification:', error);
    }
  }
}