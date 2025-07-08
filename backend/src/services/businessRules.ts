import { RestaurantModel } from '../models/Restaurant';

export interface BusinessRulesError {
  code: string;
  message: string;
  details?: any;
}

export class BusinessRulesService {
  /**
   * Validates if a booking request follows all restaurant business rules
   */
  static async validateBookingRequest(
    restaurantId: string,
    bookingDate: string,
    bookingTime: string,
    partySize: number,
    isStaffBooking: boolean = false,
    overridePacing: boolean = false
  ): Promise<BusinessRulesError | null> {
    try {
      const restaurant = await RestaurantModel.findById(restaurantId);
      if (!restaurant) {
        return {
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant not found'
        };
      }

      // 1. Check if restaurant is open on the requested date
      const openingHoursError = await this.validateOpeningHours(
        restaurant.openingHours,
        bookingDate,
        bookingTime
      );
      if (openingHoursError) {
        return openingHoursError;
      }

      // 2. Check booking advance time limits
      const advanceBookingError = this.validateAdvanceBooking(
        bookingDate,
        bookingTime,
        restaurant.bookingSettings
      );
      if (advanceBookingError) {
        return advanceBookingError;
      }

      // 3. Check party size limits
      const partySizeError = this.validatePartySize(
        partySize,
        restaurant.bookingSettings
      );
      if (partySizeError) {
        return partySizeError;
      }

      // 4. For staff bookings, check if override is needed for pacing
      if (isStaffBooking && !overridePacing) {
        // Staff bookings still need to respect basic business rules
        // but can override pacing limits with proper justification
        const pacingError = await this.validatePacingLimits(
          restaurantId,
          bookingDate,
          bookingTime,
          partySize
        );
        if (pacingError) {
          return {
            code: 'PACING_OVERRIDE_REQUIRED',
            message: 'This booking exceeds normal pacing limits. Please provide override reason.',
            details: pacingError
          };
        }
      }

      return null; // All validations passed
    } catch (error) {
      console.error('Business rules validation error:', error);
      return {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate booking request'
      };
    }
  }

  /**
   * Validates if the restaurant is open at the requested date and time
   */
  private static async validateOpeningHours(
    openingHours: any,
    bookingDate: string,
    bookingTime: string
  ): Promise<BusinessRulesError | null> {
    const requestDate = new Date(bookingDate);
    const dayOfWeek = this.getDayOfWeek(requestDate);
    const daySchedule = openingHours[dayOfWeek];

    if (!daySchedule || !daySchedule.isOpen) {
      return {
        code: 'RESTAURANT_CLOSED',
        message: `Restaurant is closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}s`
      };
    }

    // Check if the booking time falls within any service period
    const bookingTimeMinutes = this.timeToMinutes(bookingTime);
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
      return {
        code: 'OUTSIDE_SERVICE_HOURS',
        message: 'Booking time is outside restaurant service hours'
      };
    }

    return null;
  }

  /**
   * Validates booking advance time limits
   */
  private static validateAdvanceBooking(
    bookingDate: string,
    bookingTime: string,
    bookingSettings: any
  ): BusinessRulesError | null {
    const now = new Date();
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check minimum advance booking time
    if (hoursUntilBooking < bookingSettings.minAdvanceBookingHours) {
      return {
        code: 'TOO_SOON',
        message: `Bookings must be made at least ${bookingSettings.minAdvanceBookingHours} hours in advance`
      };
    }

    // Check maximum advance booking time
    const daysUntilBooking = hoursUntilBooking / 24;
    if (daysUntilBooking > bookingSettings.maxAdvanceBookingDays) {
      return {
        code: 'TOO_FAR_AHEAD',
        message: `Bookings can only be made up to ${bookingSettings.maxAdvanceBookingDays} days in advance`
      };
    }

    return null;
  }

  /**
   * Validates party size limits
   */
  private static validatePartySize(
    partySize: number,
    bookingSettings: any
  ): BusinessRulesError | null {
    if (partySize < 1) {
      return {
        code: 'INVALID_PARTY_SIZE',
        message: 'Party size must be at least 1'
      };
    }

    if (partySize > bookingSettings.maxPartySize) {
      return {
        code: 'PARTY_TOO_LARGE',
        message: `Maximum party size is ${bookingSettings.maxPartySize}`
      };
    }

    return null;
  }

  /**
   * Validates pacing limits (concurrent bookings)
   */
  private static async validatePacingLimits(
    restaurantId: string,
    bookingDate: string,
    bookingTime: string,
    partySize: number
  ): Promise<BusinessRulesError | null> {
    // This would check concurrent booking limits
    // Implementation would be similar to the existing checkConcurrentBookingLimits
    // but return structured error instead of boolean
    return null; // Placeholder for now
  }

  /**
   * Utility functions
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private static timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}