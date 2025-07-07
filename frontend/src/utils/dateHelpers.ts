import { parseISO, format, isValid } from 'date-fns';

// Global date format state - will be updated by restaurant settings
let globalDateFormat: 'us' | 'uk' = 'uk'; // Default to UK format

/**
 * Set the global date format preference
 */
export function setGlobalDateFormat(format: 'us' | 'uk') {
  globalDateFormat = format;
}

/**
 * Get the appropriate date format string based on the global preference
 */
export function getDateFormatString(type: 'short' | 'long' | 'display' = 'display'): string {
  if (globalDateFormat === 'uk') {
    switch (type) {
      case 'short': return 'd/M/yyyy';
      case 'long': return 'EEEE, d MMMM yyyy';
      case 'display': return 'd MMM yyyy';
      default: return 'd MMM yyyy';
    }
  } else {
    switch (type) {
      case 'short': return 'M/d/yyyy';
      case 'long': return 'EEEE, MMMM d, yyyy';
      case 'display': return 'MMM d, yyyy';
      default: return 'MMM d, yyyy';
    }
  }
}

/**
 * Format a date using the configured format preference
 */
export function formatDateWithPreference(date: Date, type: 'short' | 'long' | 'display' = 'display'): string {
  if (!isValid(date)) return 'Invalid Date';
  return format(date, getDateFormatString(type));
}

/**
 * Safely parse a booking's date and time fields into a valid Date object
 * Handles the backend's format where bookingDate is a UTC timestamp and bookingTime is a time string
 */
export function parseBookingDateTime(booking: { bookingDate?: string | null; bookingTime?: string | null }): Date | null {
  if (!booking.bookingDate || !booking.bookingTime) {
    return null;
  }

  try {
    // Extract just the date part from bookingDate (YYYY-MM-DD)
    const datePart = booking.bookingDate.split('T')[0];
    
    // Extract just the time part from bookingTime (HH:MM:SS -> HH:MM)
    const timePart = booking.bookingTime.split(':').slice(0, 2).join(':');
    
    // Combine them into a proper ISO string
    const combinedDateTime = `${datePart}T${timePart}:00`;
    
    const parsed = parseISO(combinedDateTime);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error parsing booking date/time:', error, booking);
    return null;
  }
}

/**
 * Format a booking's date for display
 */
export function formatBookingDate(booking: { bookingDate?: string | null }): string {
  if (!booking.bookingDate) {
    return 'N/A';
  }

  try {
    // Extract just the date part to avoid timezone issues
    const datePart = booking.bookingDate.split('T')[0];
    const parsed = parseISO(datePart + 'T00:00:00');
    return isValid(parsed) ? formatDateWithPreference(parsed, 'display') : 'Invalid Date';
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Format a booking's time for display
 */
export function formatBookingTime(booking: { bookingTime?: string | null }): string {
  if (!booking.bookingTime) {
    return 'N/A';
  }

  try {
    // bookingTime is in format "HH:MM:SS", we want "h:mm a"
    const [hours, minutes] = booking.bookingTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    return booking.bookingTime;
  }
}

/**
 * Check if a booking is for today
 */
export function isBookingToday(booking: { bookingDate?: string | null }): boolean {
  if (!booking.bookingDate) {
    return false;
  }

  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const bookingDatePart = booking.bookingDate.split('T')[0];
    return bookingDatePart === today;
  } catch (error) {
    return false;
  }
}