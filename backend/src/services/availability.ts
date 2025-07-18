import { RestaurantModel } from '../models/Restaurant';
import { TableModel } from '../models/Table';
import { BookingModel } from '../models/Booking';
import { db } from '../config/database';
import { BookingAvailability, TimeSlot, Table, Booking } from '../types';

export class AvailabilityService {
  static async checkAvailability(
    restaurantId: string,
    date: string,
    partySize: number,
    duration?: number
  ): Promise<BookingAvailability> {
    const debugInfo = {
      restaurantId,
      date,
      partySize,
      duration,
      timestamp: new Date().toISOString()
    };
    
    try {
      console.log('[AvailabilityService] Starting availability check:', debugInfo);
      
      // Get restaurant settings
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        const error = new Error('Restaurant not found');
        console.error('[AvailabilityService] Restaurant lookup failed:', { ...debugInfo, error: error.message });
        throw error;
      }

      console.log('[AvailabilityService] Restaurant found:', {
        restaurantId: restaurant.id,
        name: restaurant.name,
        hasOpeningHours: !!restaurant.openingHours,
        hasBookingSettings: !!restaurant.bookingSettings
      });

      const openingHours = restaurant.openingHours;
      const bookingSettings = restaurant.bookingSettings;

      // Check if date is within booking window
      const today = new Date();
      const requestDate = new Date(date);
      const maxAdvanceDays = bookingSettings.maxAdvanceBookingDays || 270; // 9 months default
      const minAdvanceHours = bookingSettings.minAdvanceBookingHours || 2;

      console.log('[AvailabilityService] Date validation:', {
        today: today.toISOString(),
        requestDate: requestDate.toISOString(),
        maxAdvanceDays,
        minAdvanceHours
      });

      // Compare just the date part (not time) for past date check
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const requestDateOnly = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
      
      if (requestDateOnly < todayDateOnly) {
        const error = new Error('Cannot book for past dates');
        console.error('[AvailabilityService] Past date error:', { ...debugInfo, todayDateOnly, requestDateOnly });
        throw error;
      }

      const daysDiff = Math.ceil((requestDateOnly.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxAdvanceDays) {
        const error = new Error(`Cannot book more than ${maxAdvanceDays} days in advance`);
        console.error('[AvailabilityService] Advance booking limit exceeded:', { ...debugInfo, daysDiff, maxAdvanceDays });
        throw error;
      }

      // For same-day bookings, we'll check the minimum advance time per slot
      // This allows checking availability even if current time doesn't meet minimum advance
      // The actual time slots will enforce the minimum advance booking requirement

      // Get opening hours for this day
      const dayOfWeekString = this.getDayOfWeek(requestDate);
      const daySchedule = openingHours[dayOfWeekString];
      
      console.log('[AvailabilityService] Day schedule check:', {
        dayOfWeek: dayOfWeekString,
        isOpen: daySchedule?.isOpen,
        schedule: daySchedule
      });
      
      if (!daySchedule || !daySchedule.isOpen) {
        const error = new Error(`Restaurant is closed on ${this.getDayOfWeek(requestDate).charAt(0).toUpperCase() + this.getDayOfWeek(requestDate).slice(1)}s`);
        console.error('[AvailabilityService] Restaurant closed error:', { ...debugInfo, dayOfWeekString, daySchedule });
        throw error;
      }

      // Get appropriate turn time for this party size if duration not specified
      if (!duration) {
        duration = await this.getTurnTimeForParty(restaurantId, partySize, requestDate);
        console.log('[AvailabilityService] Calculated turn time:', { duration, partySize });
      }

      // Generate time slots using enhanced opening hours (supports multiple periods)
      console.log('[AvailabilityService] Generating time slots...');
      const timeSlots = await this.generateTimeSlotsFromOpeningHours(
        restaurantId,
        date,
        daySchedule,
        partySize,
        duration,
        bookingSettings
      );

      console.log('[AvailabilityService] Time slots generated:', {
        count: timeSlots.length,
        availableSlots: timeSlots.filter(s => s.available).length,
        firstSlot: timeSlots[0],
        lastSlot: timeSlots[timeSlots.length - 1]
      });

      return {
        date,
        timeSlots
      };
    } catch (error: any) {
      console.error('[AvailabilityService] Error checking availability:', {
        ...debugInfo,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
      throw error;
    }
  }

  /**
   * Generate time slots from enhanced opening hours (supports multiple periods per day)
   * Handles both old format (openTime/closeTime) and new format (periods array)
   */
  private static async generateTimeSlotsFromOpeningHours(
    restaurantId: string,
    date: string,
    daySchedule: any,
    partySize: number,
    duration: number,
    bookingSettings: any
  ): Promise<TimeSlot[]> {
    const allSlots: TimeSlot[] = [];

    // Get all tables that can accommodate the party size
    const availableTables = await TableModel.findAvailableTablesForPartySize(restaurantId, partySize);
    const tableCombinations = await TableModel.findTableCombinationsForPartySize(restaurantId, partySize);

    if (availableTables.length === 0 && tableCombinations.length === 0) {
      return allSlots;
    }

    // Get existing bookings for the date (excluding cancelled/no-show)
    const allBookings = await BookingModel.findByDateRange(restaurantId, date, date);
    const existingBookings = allBookings.filter(
      booking => booking.status !== 'cancelled' && booking.status !== 'no_show'
    );

    // Pre-calculate concurrent booking limits once
    const maxConcurrentTables = bookingSettings.maxConcurrentTables;
    const maxConcurrentCovers = bookingSettings.maxConcurrentCovers;

    // Determine service periods - handle both old and new formats
    let servicePeriods: { name: string; startTime: string; endTime: string; slotDuration: number }[] = [];

    if (daySchedule.periods && daySchedule.periods.length > 0) {
      // NEW FORMAT: Multiple periods per day
      servicePeriods = daySchedule.periods.map((period: any) => ({
        name: period.name,
        startTime: period.startTime,
        endTime: period.endTime,
        slotDuration: period.slotDurationMinutes || bookingSettings.slotDuration || 30
      }));
    } else if (daySchedule.openTime && daySchedule.closeTime) {
      // OLD FORMAT: Single period (backward compatibility)
      servicePeriods = [{
        name: 'Service',
        startTime: daySchedule.openTime,
        endTime: daySchedule.closeTime,
        slotDuration: bookingSettings.slotDuration || 30
      }];
    } else {
      // No valid time periods found
      return allSlots;
    }

    // Process each service period (e.g., lunch service, dinner service)
    for (const period of servicePeriods) {
      const periodSlots: TimeSlot[] = [];

      // Convert time strings to minutes for easier calculation
      const openMinutes = this.timeToMinutes(period.startTime);
      const closeMinutes = this.timeToMinutes(period.endTime);

      // Generate slots for this time period (closing time is last bookable slot)
      for (let minutes = openMinutes; minutes <= closeMinutes; minutes += period.slotDuration) {
        const slotTime = this.minutesToTime(minutes);
        const startMinutes = minutes;
        const endMinutes = minutes + duration;

        // Check minimum advance booking requirement for this specific slot
        const minAdvanceHours = bookingSettings.minAdvanceBookingHours || 2;
        const slotDateTime = new Date(`${date}T${slotTime}`);
        const now = new Date();
        const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilSlot < minAdvanceHours) {
          continue; // Skip this slot as it doesn't meet minimum advance requirement
        }

        // Check concurrent booking limits in-memory
        let concurrentLimitExceeded = false;
        if (maxConcurrentTables || maxConcurrentCovers) {
          const concurrentBookings = existingBookings.filter(booking => {
            if (booking.status === 'cancelled' || booking.status === 'no_show') {
              return false;
            }
            const bookingStartMinutes = this.timeToMinutes(booking.bookingTime);
            return bookingStartMinutes === startMinutes;
          });

          if (maxConcurrentTables && concurrentBookings.length >= maxConcurrentTables) {
            concurrentLimitExceeded = true;
          }

          if (maxConcurrentCovers) {
            const currentCovers = concurrentBookings.reduce((sum, booking) => sum + booking.partySize, 0);
            if (currentCovers + partySize > maxConcurrentCovers) {
              concurrentLimitExceeded = true;
            }
          }
        }

        let available = false;
        let tableId: string | undefined;

        if (!concurrentLimitExceeded) {
          // Check single table availability first (preferred)
          for (const table of availableTables) {
            if (this.isTableAvailable(table.id, startMinutes, endMinutes, existingBookings)) {
              available = true;
              tableId = table.id;
              break;
            }
          }

          // Check table combinations if no single table available
          if (!available) {
            for (const combination of tableCombinations) {
              const allTablesAvailable = combination.every(table =>
                this.isTableAvailable(table.id, startMinutes, endMinutes, existingBookings)
              );
              if (allTablesAvailable) {
                available = true;
                tableId = combination[0].id; // Primary table
                break;
              }
            }
          }
        }

        periodSlots.push({
          time: slotTime,
          available,
          tableId,
          waitlistAvailable: !available
        });
      }

      // Add period slots to all slots
      allSlots.push(...periodSlots);
    }

    // Sort all slots by time
    allSlots.sort((a, b) => {
      const timeA = this.timeToMinutes(a.time);
      const timeB = this.timeToMinutes(b.time);
      return timeA - timeB;
    });

    return allSlots;
  }

  private static async checkSlotAvailability(
    restaurantId: string,
    date: string,
    startTime: string,
    endTime: string,
    partySize: number,
    duration: number,
    availableTables: Table[],
    tableCombinations: Table[][],
    existingBookings: Booking[],
    isStaffBooking: boolean = false
  ): Promise<{
    available: boolean;
    tableId?: string;
    waitlistAvailable: boolean;
  }> {
    // No caching - compute availability directly

    // Calculate time windows (no buffer time anymore)
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Check concurrent booking limits for guest bookings only
    if (!isStaffBooking) {
      const concurrentLimitExceeded = await this.checkConcurrentBookingLimits(
        restaurantId,
        date,
        startTime,
        partySize,
        existingBookings
      );
      
      if (concurrentLimitExceeded) {
        return {
          available: false,
          waitlistAvailable: true
        };
      }
    }

    // Check single table availability first (preferred)
    for (const table of availableTables) {
      if (this.isTableAvailable(
        table.id,
        startMinutes,
        endMinutes,
        existingBookings
      )) {
        const result = {
          available: true,
          tableId: table.id,
          waitlistAvailable: false
        };


        return result;
      }
    }

    // Check table combinations
    for (const combination of tableCombinations) {
      const allTablesAvailable = combination.every(table =>
        this.isTableAvailable(
          table.id,
          startMinutes,
          endMinutes,
          existingBookings
        )
      );

      if (allTablesAvailable) {
        const result = {
          available: true,
          tableId: combination[0].id, // Primary table
          waitlistAvailable: false
        };

        return result;
      }
    }

    // No tables available, but waitlist might be enabled
    const result = {
      available: false,
      waitlistAvailable: true
    };


    return result;
  }

  private static isTableAvailable(
    tableId: string,
    startMinutes: number,
    endMinutes: number,
    existingBookings: Booking[]
  ): boolean {
    const tableBookings = existingBookings.filter(
      booking => booking.tableId === tableId &&
      booking.status !== 'cancelled' &&
      booking.status !== 'no_show'
    );

    for (const booking of tableBookings) {
      const bookingStartMinutes = this.timeToMinutes(booking.bookingTime);
      const bookingEndMinutes = bookingStartMinutes + booking.duration;

      // Check for overlap
      if (!(endMinutes <= bookingStartMinutes || startMinutes >= bookingEndMinutes)) {
        return false;
      }
    }

    return true;
  }

  static async findBestTable(
    restaurantId: string,
    date: string,
    startTime: string,
    partySize: number,
    duration?: number,
    isStaffBooking: boolean = false
  ): Promise<Table | null> {
    try {
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        return null;
      }

      // Validate opening hours before attempting to find tables
      const requestDate = new Date(date);
      const dayOfWeekString = this.getDayOfWeek(requestDate);
      const daySchedule = restaurant.openingHours[dayOfWeekString];
      
      if (!daySchedule || !daySchedule.isOpen) {
        throw new Error(`Restaurant is closed on ${dayOfWeekString.charAt(0).toUpperCase() + dayOfWeekString.slice(1)}s`);
      }

      // Check if the booking time falls within service hours
      const bookingTimeMinutes = this.timeToMinutes(startTime);
      let isWithinServicePeriod = false;

      if (daySchedule.periods && daySchedule.periods.length > 0) {
        // New format with multiple service periods
        for (const period of daySchedule.periods) {
          const startMinutes = this.timeToMinutes(period.startTime);
          const endMinutes = this.timeToMinutes(period.endTime);
          
          if (bookingTimeMinutes >= startMinutes && bookingTimeMinutes <= endMinutes) {
            isWithinServicePeriod = true;
            break;
          }
        }
      } else if (daySchedule.openTime && daySchedule.closeTime) {
        // Legacy format with single period
        const openMinutes = this.timeToMinutes(daySchedule.openTime);
        const closeMinutes = this.timeToMinutes(daySchedule.closeTime);
        
        if (bookingTimeMinutes >= openMinutes && bookingTimeMinutes <= closeMinutes) {
          isWithinServicePeriod = true;
        }
      }

      if (!isWithinServicePeriod) {
        throw new Error('Booking time is outside restaurant service hours');
      }

      // Get available tables for party size
      const availableTables = await TableModel.findAvailableTablesForPartySize(restaurantId, partySize);
      
      if (availableTables.length === 0) {
        return null;
      }

      // Get existing bookings
      const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);

      // Check concurrent booking limits for guest bookings only
      if (!isStaffBooking) {
        const concurrentLimitExceeded = await this.checkConcurrentBookingLimits(
          restaurantId,
          date,
          startTime,
          partySize,
          existingBookings
        );
        
        if (concurrentLimitExceeded) {
          return null;
        }
      }

      // Get appropriate turn time if not specified
      if (!duration) {
        duration = await this.getTurnTimeForParty(restaurantId, partySize, requestDate, startTime);
      }

      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = startMinutes + duration;
      // Removed buffer time calculations

      // Find the best available table (smallest that fits the party)
      const availableTablesForSlot = availableTables.filter(table =>
        this.isTableAvailable(
          table.id,
          startMinutes,
          endMinutes,
          existingBookings
        )
      );

      if (availableTablesForSlot.length === 0) {
        return null;
      }

      // Sort by capacity (smallest first) to optimize table usage
      availableTablesForSlot.sort((a, b) => a.capacity - b.capacity);
      
      return availableTablesForSlot[0];
    } catch (error) {
      console.error('Error finding best table:', error);
      return null;
    }
  }

  /**
   * Check if concurrent booking limits would be exceeded for guest bookings
   * Staff bookings can override these limits
   */
  private static async checkConcurrentBookingLimits(
    restaurantId: string,
    date: string,
    startTime: string,
    partySize: number,
    existingBookings: Booking[]
  ): Promise<boolean> {
    try {
      // Get restaurant settings
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        return false; // If can't find restaurant, don't block
      }

      const bookingSettings = restaurant.bookingSettings;
      const maxConcurrentTables = bookingSettings.maxConcurrentTables;
      const maxConcurrentCovers = bookingSettings.maxConcurrentCovers;

      // If no limits are set, don't restrict
      if (!maxConcurrentTables && !maxConcurrentCovers) {
        return false;
      }

      // Find bookings that start at the same time as the requested slot
      const startTimeMinutes = this.timeToMinutes(startTime);
      const concurrentBookings = existingBookings.filter(booking => {
        if (booking.status === 'cancelled' || booking.status === 'no_show') {
          return false;
        }
        
        const bookingStartMinutes = this.timeToMinutes(booking.bookingTime);
        return bookingStartMinutes === startTimeMinutes;
      });

      // Check table limit
      if (maxConcurrentTables && concurrentBookings.length >= maxConcurrentTables) {
        console.log(`Concurrent table limit exceeded: ${concurrentBookings.length} >= ${maxConcurrentTables}`);
        return true;
      }

      // Check covers (people) limit
      if (maxConcurrentCovers) {
        const currentCovers = concurrentBookings.reduce((sum, booking) => sum + booking.partySize, 0);
        if (currentCovers + partySize > maxConcurrentCovers) {
          console.log(`Concurrent covers limit exceeded: ${currentCovers + partySize} > ${maxConcurrentCovers}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking concurrent booking limits:', error);
      return false; // Don't block on error
    }
  }



  private static getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  public static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  public static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Get the appropriate turn time for a party size
   * Checks party-size rules, then time slot rules, then restaurant default
   */
  static async getTurnTimeForParty(
    restaurantId: string,
    partySize: number,
    bookingDate: Date,
    bookingTime?: string
  ): Promise<number> {
    try {
      // First try to get from database function
      const query = `
        SELECT get_turn_time_for_party($1, $2, $3, $4) as turn_time
      `;
      
      const dayOfWeek = bookingDate.getDay();
      const timeParam = bookingTime ? bookingTime : null;
      
      const result = await db.query(query, [
        restaurantId,
        partySize,
        timeParam,
        dayOfWeek
      ]);

      if (result.rows[0]?.turn_time) {
        return result.rows[0].turn_time;
      }

      // Fallback to default when no turn time rule is found
      return 120;
    } catch (error) {
      console.error('Error getting turn time for party:', error);
      // Default to 120 minutes on error
      return 120;
    }
  }
}