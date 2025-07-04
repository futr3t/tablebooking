import { RestaurantModel } from '../models/Restaurant';
import { TableModel } from '../models/Table';
import { BookingModel } from '../models/Booking';
import { redis } from '../config/database';
import { BookingAvailability, TimeSlot, Table, Booking } from '../types';

export class AvailabilityService {
  static async checkAvailability(
    restaurantId: string,
    date: string,
    partySize: number,
    duration: number = 120
  ): Promise<BookingAvailability> {
    try {
      // Get restaurant settings
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const openingHours = restaurant.openingHours;
      const bookingSettings = restaurant.bookingSettings;

      // Check if date is within booking window
      const today = new Date();
      const requestDate = new Date(date);
      const maxAdvanceDays = bookingSettings.maxAdvanceBookingDays || 270; // 9 months default
      const minAdvanceHours = bookingSettings.minAdvanceBookingHours || 2;

      if (requestDate < today) {
        throw new Error('Cannot book for past dates');
      }

      const daysDiff = Math.ceil((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxAdvanceDays) {
        throw new Error(`Cannot book more than ${maxAdvanceDays} days in advance`);
      }

      // Check if booking is too soon
      const hoursDiff = (requestDate.getTime() - today.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < minAdvanceHours) {
        throw new Error(`Must book at least ${minAdvanceHours} hours in advance`);
      }

      // Get opening hours for this day
      const dayOfWeekString = this.getDayOfWeek(requestDate);
      const daySchedule = openingHours[dayOfWeekString];
      
      console.log('📅 Availability check debug:', {
        requestDate: requestDate.toISOString(),
        dayOfWeekString,
        daySchedule,
        hasOpeningHours: !!openingHours,
        openingHoursKeys: Object.keys(openingHours || {})
      });
      
      if (!daySchedule || !daySchedule.isOpen) {
        console.log('❌ Restaurant closed or no schedule found');
        return {
          date,
          timeSlots: []
        };
      }

      // Generate time slots using enhanced opening hours (supports multiple periods)
      const timeSlots = await this.generateTimeSlotsFromOpeningHours(
        restaurantId,
        date,
        daySchedule,
        partySize,
        duration,
        bookingSettings
      );

      return {
        date,
        timeSlots
      };
    } catch (error) {
      console.error('Error checking availability:', error);
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

    // Get existing bookings for the date
    const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);

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

      // Generate slots for this time period
      for (let minutes = openMinutes; minutes <= closeMinutes - duration; minutes += period.slotDuration) {
        const slotTime = this.minutesToTime(minutes);
        const endTime = this.minutesToTime(minutes + duration);

        // Check availability for this time slot
        const availability = await this.checkSlotAvailability(
          restaurantId,
          date,
          slotTime,
          endTime,
          partySize,
          duration,
          availableTables,
          tableCombinations,
          existingBookings,
          false // isStaffBooking = false for availability check
        );

        periodSlots.push({
          time: slotTime,
          available: availability.available,
          tableId: availability.tableId,
          waitlistAvailable: availability.waitlistAvailable
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
    // Check cache first (if Redis is available) - only for guest bookings
    const cacheKey = `availability:${restaurantId}:${date}:${startTime}:${partySize}:${isStaffBooking}`;
    if (redis && !isStaffBooking) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error.message);
      }
    }

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
        const result = {
          available: false,
          waitlistAvailable: true
        };
        
        if (redis) {
          try {
            await redis.setex(cacheKey, 60, JSON.stringify(result));
          } catch (error) {
            console.warn('Redis cache write failed:', error.message);
          }
        }
        return result;
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

        // Cache result for 1 minute (if Redis is available)
        if (redis && !isStaffBooking) {
          try {
            await redis.setex(cacheKey, 60, JSON.stringify(result));
          } catch (error) {
            console.warn('Redis cache write failed:', error.message);
          }
        }
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

        if (redis && !isStaffBooking) {
          try {
            await redis.setex(cacheKey, 60, JSON.stringify(result));
          } catch (error) {
            console.warn('Redis cache write failed:', error.message);
          }
        }
        return result;
      }
    }

    // No tables available, but waitlist might be enabled
    const result = {
      available: false,
      waitlistAvailable: true
    };

    if (redis && !isStaffBooking) {
      try {
        await redis.setex(cacheKey, 60, JSON.stringify(result));
      } catch (error) {
        console.warn('Redis cache write failed:', error.message);
      }
    }
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
    duration: number = 120,
    isStaffBooking: boolean = false
  ): Promise<Table | null> {
    try {
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        return null;
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

  static async invalidateAvailabilityCache(restaurantId: string, date: string): Promise<void> {
    // If Redis is not available, skip cache invalidation
    if (!redis) {
      return;
    }

    try {
      const pattern = `availability:${restaurantId}:${date}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating availability cache:', error);
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
}