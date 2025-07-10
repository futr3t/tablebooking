import { RestaurantModel } from '../models/Restaurant';
import { TableModel } from '../models/Table';
import { BookingModel } from '../models/Booking';
import { AvailabilityService } from './availability';
import { redis } from '../config/database';
import { EnhancedTimeSlot, Table, Booking, Restaurant } from '../types';

export class EnhancedAvailabilityService extends AvailabilityService {
  /**
   * Get enhanced availability with pacing status and suggestions
   */
  static async getEnhancedAvailability(
    restaurantId: string,
    date: string,
    partySize: number,
    duration: number = 120,
    preferredTime?: string
  ): Promise<{
    date: string;
    timeSlots: EnhancedTimeSlot[];
    suggestions: {
      quietTimes: string[];
      peakTimes: string[];
      bestAvailability: string[];
    };
  }> {
    try {
      // Get restaurant settings first to validate party size
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Get all tables to check maximum capacity
      const allTablesForValidation = await TableModel.findByRestaurant(restaurantId);
      const activeTables = allTablesForValidation.tables.filter(t => t.isActive);
      
      // Check if party size can be accommodated by any table or combination
      const maxSingleTableCapacity = Math.max(...activeTables.map(t => t.maxCapacity));
      const maxCombinationCapacity = Math.min(
        activeTables.reduce((sum, t) => sum + t.maxCapacity, 0),
        30 // Reasonable limit for combined tables
      );
      
      if (partySize > maxCombinationCapacity) {
        throw new Error(`Party size of ${partySize} exceeds maximum capacity of ${maxCombinationCapacity}. Please contact the restaurant directly for large group bookings.`);
      }

      // Get basic availability
      const basicAvailability = await EnhancedAvailabilityService.checkAvailability(
        restaurantId,
        date,
        partySize,
        duration
      );

      // Get all bookings for the date
      const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);
      
      // Get all tables
      const allTablesResult = await TableModel.findByRestaurant(restaurantId);
      const allTables = allTablesResult.tables;
      const totalTables = allTables.filter(t => t.isActive).length;
      const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);

      // Enhance time slots with pacing information
      const enhancedSlots: EnhancedTimeSlot[] = await Promise.all(
        basicAvailability.timeSlots.map(async (slot) => {
          const slotData = await EnhancedAvailabilityService.getSlotPacingData(
            slot.time,
            existingBookings,
            totalTables,
            totalCapacity,
            restaurant,
            partySize
          );

          return {
            ...slot,
            pacingStatus: slotData.pacingStatus,
            tablesAvailable: slotData.tablesAvailable,
            suggestedTables: slotData.suggestedTables,
            alternativeTimes: slotData.alternativeTimes,
            canOverride: slotData.canOverride,
            totalTablesBooked: slotData.totalTablesBooked
          };
        })
      );

      // Generate suggestions
      const suggestions = EnhancedAvailabilityService.generateSuggestions(enhancedSlots, preferredTime);

      return {
        date,
        timeSlots: enhancedSlots,
        suggestions
      };
    } catch (error) {
      console.error('Error getting enhanced availability:', error);
      throw error;
    }
  }

  /**
   * Calculate pacing data for a specific time slot
   */
  private static async getSlotPacingData(
    slotTime: string,
    existingBookings: Booking[],
    totalTables: number,
    totalCapacity: number,
    restaurant: Restaurant,
    partySize: number
  ): Promise<{
    pacingStatus: 'available' | 'moderate' | 'busy' | 'full' | 'pacing_full' | 'physically_full';
    tablesAvailable: number;
    totalTablesBooked?: number;
    suggestedTables?: Table[];
    alternativeTimes: string[];
    canOverride?: boolean;
  }> {
    const slotMinutes = AvailabilityService.timeToMinutes(slotTime);
    
    // CRITICAL: First check physical table availability for this specific party size and time
    const availableTables = await TableModel.findAvailableTablesForTimeSlot(
      restaurant.id,
      slotTime,
      partySize
    );

    const hasPhysicalTables = availableTables.length > 0;
    
    // If no physical tables are available, immediately mark as physically_full
    if (!hasPhysicalTables) {
      // Still calculate alternatives for suggestions
      const alternativeTimes = await this.findAlternativeTimesForParty(
        restaurant.id,
        slotTime,
        partySize,
        existingBookings
      );

      return {
        pacingStatus: 'physically_full',
        tablesAvailable: 0,
        totalTablesBooked: totalTables, // All tables effectively booked
        suggestedTables: [],
        alternativeTimes: alternativeTimes.slice(0, 4),
        canOverride: false // Cannot override when no physical tables exist
      };
    }

    // Count bookings starting within 30 minutes of this slot (for pacing calculations)
    const nearbyBookings = existingBookings.filter(booking => {
      if (booking.status === 'cancelled' || booking.status === 'no_show') {
        return false;
      }
      const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
      return Math.abs(bookingMinutes - slotMinutes) < 30;
    });

    const tablesBooked = nearbyBookings.length;
    const coversBooked = nearbyBookings.reduce((sum, b) => sum + b.partySize, 0);
    
    // Calculate utilization percentages for pacing
    const tableUtilization = (tablesBooked / totalTables) * 100;
    const coverUtilization = (coversBooked / totalCapacity) * 100;
    
    // Determine base pacing status (when tables ARE physically available)
    let pacingStatus: 'available' | 'moderate' | 'busy' | 'full' | 'pacing_full';
    
    // Enhanced pacing logic: consider both table count AND actual availability
    const availabilityRatio = (availableTables.length / totalTables) * 100;
    
    if (tableUtilization >= 90 || coverUtilization >= 90 || availabilityRatio <= 10) {
      // High utilization OR very few tables left - this is pacing_full (can override)
      pacingStatus = 'pacing_full';
    } else if (tableUtilization >= 70 || coverUtilization >= 70 || availabilityRatio <= 30) {
      pacingStatus = 'busy';
    } else if (tableUtilization >= 40 || coverUtilization >= 40 || availabilityRatio <= 60) {
      pacingStatus = 'moderate';
    } else {
      pacingStatus = 'available';
    }

    // Generate alternative times if slot is busy/full
    const alternativeTimes = await this.findAlternativeTimesForParty(
      restaurant.id,
      slotTime,
      partySize,
      existingBookings
    );

    return {
      pacingStatus,
      tablesAvailable: availableTables.length, // Actual available tables for this party size
      totalTablesBooked: tablesBooked,
      suggestedTables: availableTables.slice(0, 3), // Top 3 suggestions
      alternativeTimes: alternativeTimes.slice(0, 4), // Up to 4 alternatives
      canOverride: true // Can override when physical tables exist (handled by pacing status)
    };
  }

  /**
   * Find alternative times for a party when requested slot is busy/full
   */
  private static async findAlternativeTimesForParty(
    restaurantId: string,
    requestedTime: string,
    partySize: number,
    existingBookings: Booking[]
  ): Promise<string[]> {
    const requestedMinutes = AvailabilityService.timeToMinutes(requestedTime);
    const alternativeTimes: string[] = [];
    
    // Look for quieter times within 1 hour (before and after)
    const searchOffsets = [-60, -30, 30, 60]; // minutes relative to requested time
    
    for (const offset of searchOffsets) {
      const altMinutes = requestedMinutes + offset;
      
      // Ensure the time is within valid operating hours (0-1440 minutes = 24 hours)
      if (altMinutes >= 0 && altMinutes <= 1440) {
        const altTime = AvailabilityService.minutesToTime(altMinutes);
        
        // Quick check: count bookings near this alternative time
        const nearbyBookings = existingBookings.filter(booking => {
          if (booking.status === 'cancelled' || booking.status === 'no_show') {
            return false;
          }
          const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
          return Math.abs(bookingMinutes - altMinutes) < 30; // Within 30 minutes
        });
        
        // Check if this time has available tables for the party size
        try {
          const availableTables = await TableModel.findAvailableTablesForTimeSlot(
            restaurantId,
            altTime,
            partySize
          );
          
          // If tables are available and it's less busy, suggest it
          if (availableTables.length > 0 && nearbyBookings.length < 5) { // Arbitrary threshold
            alternativeTimes.push(altTime);
          }
        } catch (error) {
          // Skip this alternative if there's an error checking availability
          console.warn(`Error checking alternative time ${altTime}:`, error);
          continue;
        }
      }
    }
    
    return alternativeTimes;
  }

  /**
   * Generate suggestions based on availability patterns
   */
  private static generateSuggestions(
    slots: EnhancedTimeSlot[],
    preferredTime?: string
  ): {
    quietTimes: string[];
    peakTimes: string[];
    bestAvailability: string[];
  } {
    const quietTimes: string[] = [];
    const peakTimes: string[] = [];
    const bestAvailability: string[] = [];

    // Categorize slots
    slots.forEach(slot => {
      if (slot.available) {
        if (slot.pacingStatus === 'available') {
          quietTimes.push(slot.time);
          bestAvailability.push(slot.time);
        } else if (slot.pacingStatus === 'moderate') {
          bestAvailability.push(slot.time);
        }
      }
      
      if (slot.pacingStatus === 'busy' || slot.pacingStatus === 'full') {
        peakTimes.push(slot.time);
      }
    });

    // If preferred time is provided, sort by proximity
    if (preferredTime) {
      const preferredMinutes = AvailabilityService.timeToMinutes(preferredTime);
      bestAvailability.sort((a, b) => {
        const aMinutes = AvailabilityService.timeToMinutes(a);
        const bMinutes = AvailabilityService.timeToMinutes(b);
        return Math.abs(aMinutes - preferredMinutes) - Math.abs(bMinutes - preferredMinutes);
      });
    }

    return {
      quietTimes: quietTimes.slice(0, 5),
      peakTimes: peakTimes.slice(0, 5),
      bestAvailability: bestAvailability.slice(0, 5)
    };
  }

  /**
   * Check basic availability (delegates to parent class)
   */
  static async checkAvailability(
    restaurantId: string,
    date: string,
    partySize: number,
    duration: number = 120
  ): Promise<any> {
    return AvailabilityService.checkAvailability(restaurantId, date, partySize, duration);
  }

  /**
   * Find the best available table for a booking (delegates to parent class)
   */
  static async findBestTable(
    restaurantId: string,
    date: string,
    startTime: string,
    partySize: number,
    duration: number = 120,
    isStaffBooking: boolean = false
  ): Promise<Table | null> {
    return AvailabilityService.findBestTable(
      restaurantId,
      date,
      startTime,
      partySize,
      duration,
      isStaffBooking
    );
  }

  /**
   * Invalidate availability cache (delegates to parent class)
   */
  static async invalidateAvailabilityCache(restaurantId: string, date: string): Promise<void> {
    return AvailabilityService.invalidateAvailabilityCache(restaurantId, date);
  }

  /**
   * Check if a specific time slot can be overridden by staff
   */
  static async canOverridePacing(
    restaurantId: string,
    date: string,
    time: string,
    partySize: number,
    reason: string
  ): Promise<{
    canOverride: boolean;
    risks: string[];
    recommendations: string[];
  }> {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      return {
        canOverride: false,
        risks: ['Restaurant not found'],
        recommendations: []
      };
    }

    const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);
    const slotMinutes = AvailabilityService.timeToMinutes(time);
    
    // Check various override conditions
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    // Check kitchen capacity
    const bookingsInWindow = existingBookings.filter(booking => {
      const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
      return Math.abs(bookingMinutes - slotMinutes) < 15; // Within 15 minutes
    });
    
    if (bookingsInWindow.length >= 5) {
      risks.push('Kitchen may be overwhelmed with too many simultaneous orders');
      recommendations.push('Consider staggering the booking by 15-30 minutes');
    }
    
    // Check server capacity (assuming 4 tables per server)
    const tablesBooked = bookingsInWindow.length;
    const estimatedServersNeeded = Math.ceil(tablesBooked / 4);
    if (estimatedServersNeeded > 3) {
      risks.push('May not have enough servers for proper service');
      recommendations.push('Ensure adequate staffing for this time period');
    }
    
    // Check large party conflicts
    const largeParties = bookingsInWindow.filter(b => b.partySize >= 6);
    if (largeParties.length > 0 && partySize >= 6) {
      risks.push('Multiple large parties at the same time can strain service');
      recommendations.push('Consider alternative time slots for better service quality');
    }
    
    // Valid override reasons
    const validReasons = [
      'vip customer',
      'special event',
      'regular customer',
      'celebration',
      'business meeting',
      'compensation'
    ];
    
    const isValidReason = validReasons.some(vr => 
      reason.toLowerCase().includes(vr)
    );
    
    if (!isValidReason) {
      recommendations.push('Document the specific reason for override');
    }
    
    return {
      canOverride: true, // Staff can always override, but with warnings
      risks,
      recommendations
    };
  }
}

// Extend TableModel to add the missing method
declare module '../models/Table' {
  interface TableModel {
    findAvailableTablesForTimeSlot(
      restaurantId: string,
      time: string,
      partySize: number
    ): Promise<Table[]>;
  }
}