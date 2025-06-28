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

      // Get day of week opening hours
      const dayOfWeek = this.getDayOfWeek(requestDate);
      const daySchedule = openingHours[dayOfWeek];

      if (!daySchedule || !daySchedule.isOpen) {
        return {
          date,
          timeSlots: []
        };
      }

      // Generate time slots
      const timeSlots = await this.generateTimeSlots(
        restaurantId,
        date,
        daySchedule.openTime,
        daySchedule.closeTime,
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

  private static async generateTimeSlots(
    restaurantId: string,
    date: string,
    openTime: string,
    closeTime: string,
    partySize: number,
    duration: number,
    bookingSettings: any
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const slotDuration = bookingSettings.slotDuration || 30; // minutes
    const bufferTime = bookingSettings.bufferTime || 15; // minutes

    // Get all tables that can accommodate the party size
    const availableTables = await TableModel.findAvailableTablesForPartySize(restaurantId, partySize);
    const tableCombinations = await TableModel.findTableCombinationsForPartySize(restaurantId, partySize);

    if (availableTables.length === 0 && tableCombinations.length === 0) {
      return slots;
    }

    // Get existing bookings for the date
    const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);

    // Convert time strings to minutes for easier calculation
    const openMinutes = this.timeToMinutes(openTime);
    const closeMinutes = this.timeToMinutes(closeTime);

    // Generate slots every slotDuration minutes
    for (let minutes = openMinutes; minutes <= closeMinutes - duration; minutes += slotDuration) {
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
        bufferTime,
        availableTables,
        tableCombinations,
        existingBookings
      );

      slots.push({
        time: slotTime,
        available: availability.available,
        tableId: availability.tableId,
        waitlistAvailable: availability.waitlistAvailable
      });
    }

    return slots;
  }

  private static async checkSlotAvailability(
    restaurantId: string,
    date: string,
    startTime: string,
    endTime: string,
    partySize: number,
    duration: number,
    bufferTime: number,
    availableTables: Table[],
    tableCombinations: Table[][],
    existingBookings: Booking[]
  ): Promise<{
    available: boolean;
    tableId?: string;
    waitlistAvailable: boolean;
  }> {
    // Check cache first
    const cacheKey = `availability:${restaurantId}:${date}:${startTime}:${partySize}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate time windows with buffer
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const bufferedStartMinutes = startMinutes - bufferTime;
    const bufferedEndMinutes = endMinutes + bufferTime;

    // Check single table availability first (preferred)
    for (const table of availableTables) {
      if (this.isTableAvailable(
        table.id,
        bufferedStartMinutes,
        bufferedEndMinutes,
        existingBookings
      )) {
        const result = {
          available: true,
          tableId: table.id,
          waitlistAvailable: false
        };

        // Cache result for 1 minute
        await redis.setex(cacheKey, 60, JSON.stringify(result));
        return result;
      }
    }

    // Check table combinations
    for (const combination of tableCombinations) {
      const allTablesAvailable = combination.every(table =>
        this.isTableAvailable(
          table.id,
          bufferedStartMinutes,
          bufferedEndMinutes,
          existingBookings
        )
      );

      if (allTablesAvailable) {
        const result = {
          available: true,
          tableId: combination[0].id, // Primary table
          waitlistAvailable: false
        };

        await redis.setex(cacheKey, 60, JSON.stringify(result));
        return result;
      }
    }

    // No tables available, but waitlist might be enabled
    const result = {
      available: false,
      waitlistAvailable: true
    };

    await redis.setex(cacheKey, 60, JSON.stringify(result));
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
    duration: number = 120
  ): Promise<Table | null> {
    try {
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        return null;
      }

      const bookingSettings = restaurant.bookingSettings;
      const bufferTime = bookingSettings.bufferTime || 15;

      // Get available tables for party size
      const availableTables = await TableModel.findAvailableTablesForPartySize(restaurantId, partySize);
      
      if (availableTables.length === 0) {
        return null;
      }

      // Get existing bookings
      const existingBookings = await BookingModel.findByDateRange(restaurantId, date, date);

      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = startMinutes + duration;
      const bufferedStartMinutes = startMinutes - bufferTime;
      const bufferedEndMinutes = endMinutes + bufferTime;

      // Find the best available table (smallest that fits the party)
      const availableTablesForSlot = availableTables.filter(table =>
        this.isTableAvailable(
          table.id,
          bufferedStartMinutes,
          bufferedEndMinutes,
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

  static async invalidateAvailabilityCache(restaurantId: string, date: string): Promise<void> {
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

  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}