import { RestaurantModel } from '../models/Restaurant';
import { TableModel } from '../models/Table';
import { BookingModel } from '../models/Booking';
import { AvailabilityService } from './availability';
import { db } from '../config/database';
import { EnhancedTimeSlot, Table, Booking, Restaurant, BookingAvailability } from '../types';

export class EnhancedAvailabilityService {
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
    const debugInfo = {
      restaurantId,
      date,
      partySize,
      duration,
      preferredTime,
      timestamp: new Date().toISOString()
    };
    
    try {
      console.log('[EnhancedAvailability] Starting enhanced availability check:', debugInfo);
      
      // Get restaurant settings first to validate party size
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        const error = new Error('Restaurant not found');
        console.error('[EnhancedAvailability] Restaurant not found:', debugInfo);
        throw error;
      }

      console.log('[EnhancedAvailability] Restaurant loaded:', {
        id: restaurant.id,
        name: restaurant.name
      });

      // Get all tables to check maximum capacity
      const allTablesForValidation = await TableModel.findByRestaurant(restaurantId);
      const activeTables = allTablesForValidation.tables.filter(t => t.isActive);
      
      console.log('[EnhancedAvailability] Table capacity check:', {
        totalTables: allTablesForValidation.tables.length,
        activeTables: activeTables.length,
        tableCapacities: activeTables.map(t => ({ id: t.id, min: t.minCapacity, max: t.maxCapacity }))
      });
      
      // Check if party size can be accommodated by any table or combination
      const maxSingleTableCapacity = Math.max(...activeTables.map(t => t.maxCapacity));
      const maxCombinationCapacity = Math.min(
        activeTables.reduce((sum, t) => sum + t.maxCapacity, 0),
        30 // Reasonable limit for combined tables
      );
      
      if (partySize > maxCombinationCapacity) {
        const error = new Error(`Party size of ${partySize} exceeds maximum capacity of ${maxCombinationCapacity}. Please contact the restaurant directly for large group bookings.`);
        console.error('[EnhancedAvailability] Party size exceeds capacity:', {
          ...debugInfo,
          maxSingleTableCapacity,
          maxCombinationCapacity
        });
        throw error;
      }

      // Get basic availability
      console.log('[EnhancedAvailability] Checking basic availability...');
      const basicAvailability = await AvailabilityService.checkAvailability(
        restaurantId,
        date,
        partySize,
        duration
      );

      console.log('[EnhancedAvailability] Basic availability result:', {
        slotsCount: basicAvailability.timeSlots.length,
        date: basicAvailability.date
      });

      // Get all bookings for the date (excluding cancelled/no-show)
      const allBookings = await BookingModel.findByDateRange(restaurantId, date, date);
      const existingBookings = allBookings.filter(
        booking => booking.status !== 'cancelled' && booking.status !== 'no_show'
      );
      
      console.log('[EnhancedAvailability] Existing bookings:', {
        totalBookings: allBookings.length,
        activeBookings: existingBookings.length,
        cancelledBookings: allBookings.length - existingBookings.length
      });
      
      // Get all tables
      const allTablesResult = await TableModel.findByRestaurant(restaurantId);
      const allTables = allTablesResult.tables;
      const totalTables = allTables.filter(t => t.isActive).length;
      const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);

      console.log('[EnhancedAvailability] Enhancing time slots with pacing data...');
      
      // Enhance time slots with pacing information
      const enhancedSlots: EnhancedTimeSlot[] = await Promise.all(
        basicAvailability.timeSlots.map(async (slot) => {
          const slotData = await EnhancedAvailabilityService.getSlotPacingData(
            slot.time,
            existingBookings,
            totalTables,
            totalCapacity,
            restaurant,
            partySize,
            date,
            duration
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

      console.log('[EnhancedAvailability] Enhanced slots summary:', {
        totalSlots: enhancedSlots.length,
        availableSlots: enhancedSlots.filter(s => s.available).length,
        pacingStatuses: {
          available: enhancedSlots.filter(s => s.pacingStatus === 'available').length,
          moderate: enhancedSlots.filter(s => s.pacingStatus === 'moderate').length,
          busy: enhancedSlots.filter(s => s.pacingStatus === 'busy').length,
          physically_full: enhancedSlots.filter(s => s.pacingStatus === 'physically_full').length
        }
      });

      // Generate suggestions
      const suggestions = EnhancedAvailabilityService.generateSuggestions(enhancedSlots, preferredTime);

      console.log('[EnhancedAvailability] Suggestions generated:', {
        quietTimes: suggestions.quietTimes.length,
        peakTimes: suggestions.peakTimes.length,
        bestAvailability: suggestions.bestAvailability.length
      });

      return {
        date,
        timeSlots: enhancedSlots,
        suggestions
      };
    } catch (error: any) {
      console.error('[EnhancedAvailability] Error in getEnhancedAvailability:', {
        error: error.message,
        stack: error.stack,
        params: debugInfo,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Enhanced availability check failed: ${error.message}`);
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
    partySize: number,
    date: string,
    defaultDuration: number
  ): Promise<{
    pacingStatus: 'available' | 'moderate' | 'busy' | 'pacing_full' | 'physically_full';
    tablesAvailable: number;
    totalTablesBooked?: number;
    suggestedTables?: Table[];
    alternativeTimes: string[];
    canOverride?: boolean;
    pacingDetails?: {
      concurrentTables: number;
      concurrentCovers: number;
      maxConcurrentTables?: number;
      maxConcurrentCovers?: number;
      restaurantMaxCovers?: number;
      concurrentLimitReached: boolean;
      utilization: {
        tables: number;
        covers: number;
        availability: number;
      };
    };
  }> {
    const slotMinutes = AvailabilityService.timeToMinutes(slotTime);
    
    // CRITICAL: First check physical table availability for this specific party size and time
    console.log('[EnhancedAvailability] Checking table availability for slot:', {
      restaurantId: restaurant.id,
      slotTime,
      partySize,
      date,
      defaultDuration
    });
    
    const availableTables = await TableModel.findAvailableTablesForTimeSlot(
      restaurant.id,
      slotTime,
      partySize,
      date,
      defaultDuration
    );

    console.log('[EnhancedAvailability] Table availability result:', {
      slotTime,
      availableTablesCount: availableTables.length,
      tableIds: availableTables.map(t => t.id)
    });

    const hasPhysicalTables = availableTables.length > 0;
    
    // If no physical tables are available, immediately mark as physically_full
    if (!hasPhysicalTables) {
      // Still calculate alternatives for suggestions
      const alternativeTimes = await this.findAlternativeTimesForParty(
        restaurant.id,
        slotTime,
        partySize,
        existingBookings,
        date
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

    // Count bookings starting within 30 minutes of this slot (for general pacing calculations)
    const nearbyBookings = existingBookings.filter(booking => {
      if (booking.status === 'cancelled' || booking.status === 'no_show') {
        return false;
      }
      const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
      return Math.abs(bookingMinutes - slotMinutes) < 30;
    });

    // Count bookings starting at EXACTLY the same time (for concurrent limits)
    const exactTimeBookings = existingBookings.filter(booking => {
      if (booking.status === 'cancelled' || booking.status === 'no_show') {
        return false;
      }
      const bookingMinutes = AvailabilityService.timeToMinutes(booking.bookingTime);
      return bookingMinutes === slotMinutes;
    });

    const tablesBooked = nearbyBookings.length;
    const coversBooked = nearbyBookings.reduce((sum, b) => sum + b.partySize, 0);
    
    // Concurrent booking metrics (exact time only)
    const concurrentTables = exactTimeBookings.length;
    const concurrentCovers = exactTimeBookings.reduce((sum, b) => sum + b.partySize, 0);
    
    // Get restaurant booking limits
    const bookingSettings = restaurant.bookingSettings;
    let maxConcurrentTables = bookingSettings.maxConcurrentTables;
    let maxConcurrentCovers = bookingSettings.maxConcurrentCovers;
    const restaurantMaxCovers = restaurant.maxCovers;
    
    // Check for time slot rule overrides (disabled for now)
    // const timeSlotLimits = await this.getTimeSlotConcurrentLimits(
    //   restaurant.id,
    //   date,
    //   slotTime
    // );
    const timeSlotLimits = {}; // Empty object as fallback
    
    // Time slot rules override restaurant settings if more restrictive (disabled for now)
    // if (timeSlotLimits.maxConcurrentBookings && 
    //     (!maxConcurrentTables || timeSlotLimits.maxConcurrentBookings < maxConcurrentTables)) {
    //   maxConcurrentTables = timeSlotLimits.maxConcurrentBookings;
    // }
    
    // Calculate utilization percentages for pacing
    const tableUtilization = (tablesBooked / totalTables) * 100;
    const coverUtilization = (coversBooked / totalCapacity) * 100;
    
    // Determine base pacing status (when tables ARE physically available)
    let pacingStatus: 'available' | 'moderate' | 'busy' | 'pacing_full';
    
    // Enhanced pacing logic: consider table count, availability, AND concurrent limits
    const availabilityRatio = (availableTables.length / totalTables) * 100;
    
    // CRITICAL: Check concurrent booking limits first (these are hard limits)
    let concurrentLimitReached = false;
    
    if (maxConcurrentTables && concurrentTables >= maxConcurrentTables) {
      // Concurrent table limit reached
      concurrentLimitReached = true;
      pacingStatus = 'pacing_full';
    } else if (maxConcurrentCovers && (concurrentCovers + partySize) > maxConcurrentCovers) {
      // Concurrent covers limit would be exceeded
      concurrentLimitReached = true;
      pacingStatus = 'pacing_full';
    } else if (restaurantMaxCovers && (coversBooked + partySize) > restaurantMaxCovers) {
      // Restaurant total capacity would be exceeded
      concurrentLimitReached = true;
      pacingStatus = 'pacing_full';
    } else {
      // No concurrent limits hit, use standard pacing thresholds
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
    }

    // Only generate alternative times if slot is busy/full (not for available/moderate slots)
    let alternativeTimes: string[] = [];
    if (pacingStatus === 'busy' || pacingStatus === 'pacing_full') {
      alternativeTimes = await this.findAlternativeTimesForParty(
        restaurant.id,
        slotTime,
        partySize,
        existingBookings,
        date
      );
    }

    return {
      pacingStatus,
      tablesAvailable: availableTables.length, // Actual available tables for this party size
      totalTablesBooked: tablesBooked,
      suggestedTables: availableTables.slice(0, 3), // Top 3 suggestions
      alternativeTimes: alternativeTimes.slice(0, 4), // Up to 4 alternatives
      canOverride: true, // Can override when physical tables exist (handled by pacing status)
      // Enhanced pacing information
      pacingDetails: {
        concurrentTables,
        concurrentCovers,
        maxConcurrentTables,
        maxConcurrentCovers,
        restaurantMaxCovers,
        concurrentLimitReached,
        utilization: {
          tables: Math.round(tableUtilization),
          covers: Math.round(coverUtilization),
          availability: Math.round(availabilityRatio)
        }
      }
    };
  }

  /**
   * Find alternative times for a party when requested slot is busy/full
   */
  private static async findAlternativeTimesForParty(
    restaurantId: string,
    requestedTime: string,
    partySize: number,
    existingBookings: Booking[],
    date?: string
  ): Promise<string[]> {
    const requestedMinutes = AvailabilityService.timeToMinutes(requestedTime);
    const alternativeTimes: string[] = [];
    
    // Get restaurant settings to check operating hours
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) return alternativeTimes;
    
    // Get the day of week for the requested date
    const requestDate = date ? new Date(date) : new Date();
    const dayOfWeek = requestDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = restaurant.openingHours[dayOfWeek];
    
    if (!daySchedule || !daySchedule.isOpen) {
      return alternativeTimes;
    }
    
    // Get valid service periods for this day
    let servicePeriods: { startTime: string; endTime: string }[] = [];
    
    if (daySchedule.periods && daySchedule.periods.length > 0) {
      servicePeriods = daySchedule.periods;
    } else if (daySchedule.openTime && daySchedule.closeTime) {
      servicePeriods = [{ startTime: daySchedule.openTime, endTime: daySchedule.closeTime }];
    }
    
    if (servicePeriods.length === 0) {
      return alternativeTimes;
    }
    
    // Look for quieter times within 1 hour (before and after)
    const searchOffsets = [-60, -30, 30, 60]; // minutes relative to requested time
    
    for (const offset of searchOffsets) {
      const altMinutes = requestedMinutes + offset;
      const altTime = AvailabilityService.minutesToTime(altMinutes);
      
      // Check if this alternative time falls within any service period
      let isWithinOperatingHours = false;
      for (const period of servicePeriods) {
        const periodStart = AvailabilityService.timeToMinutes(period.startTime);
        const periodEnd = AvailabilityService.timeToMinutes(period.endTime);
        
        if (altMinutes >= periodStart && altMinutes <= periodEnd) {
          isWithinOperatingHours = true;
          break;
        }
      }
      
      if (!isWithinOperatingHours) {
        continue; // Skip times outside operating hours
      }
      
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
      
      if (slot.pacingStatus === 'busy' || slot.pacingStatus === 'pacing_full') {
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
}
