import React, { createContext, useContext, useEffect, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { useAuth } from './AuthContext';
import { restaurantService } from '../services/api';
import { Booking } from '../types';

type DateFormatType = 'us' | 'uk';

interface DateFormatContextType {
  dateFormat: DateFormatType;
  restaurantSettings: any;
  formatDate: (date: Date, type?: 'short' | 'long' | 'display') => string;
  formatDateString: (dateString: string, type?: 'short' | 'long' | 'display') => string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date, dateType?: 'short' | 'long' | 'display') => string;
  formatBookingDate: (booking: { bookingDate?: string | null }) => string;
  formatBookingTime: (booking: { bookingTime?: string | null }) => string;
  isLoading: boolean;
  updateDateFormat: (format: DateFormatType) => void;
  refreshSettings: () => void;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export const useDateFormat = () => {
  const context = useContext(DateFormatContext);
  if (context === undefined) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
};

interface DateFormatProviderProps {
  children: React.ReactNode;
}

export const DateFormatProvider: React.FC<DateFormatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [dateFormat, setDateFormat] = useState<DateFormatType>('uk'); // Default to UK
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load restaurant settings to get date format preference and opening hours
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!user?.restaurantId) {
        setIsLoading(false);
        return;
      }

      try {
        const settings = await restaurantService.getSettings(user.restaurantId);
        setRestaurantSettings(settings);
        
        if (settings.dateFormat) {
          setDateFormat(settings.dateFormat);
        }
      } catch (error) {
        console.error('Error loading restaurant settings:', error);
        // Keep default format on error
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurantData();
  }, [user?.restaurantId]);

  /**
   * Get the appropriate date format string based on the preference
   */
  const getDateFormatString = (type: 'short' | 'long' | 'display' = 'display'): string => {
    if (dateFormat === 'uk') {
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
  };

  /**
   * Format a Date object using the configured format preference
   */
  const formatDate = (date: Date, type: 'short' | 'long' | 'display' = 'display'): string => {
    if (!isValid(date)) return 'Invalid Date';
    return format(date, getDateFormatString(type));
  };

  /**
   * Format a date string using the configured format preference
   */
  const formatDateString = (dateString: string, type: 'short' | 'long' | 'display' = 'display'): string => {
    try {
      const date = new Date(dateString);
      return formatDate(date, type);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  /**
   * Format time consistently (always 12-hour format)
   */
  const formatTime = (date: Date): string => {
    if (!isValid(date)) return 'Invalid Time';
    return format(date, 'h:mm a');
  };

  /**
   * Format date and time together
   */
  const formatDateTime = (date: Date, dateType: 'short' | 'long' | 'display' = 'display'): string => {
    if (!isValid(date)) return 'Invalid Date';
    return `${formatDate(date, dateType)} at ${formatTime(date)}`;
  };

  /**
   * Format a booking's date for display
   */
  const formatBookingDate = (booking: { bookingDate?: string | null }): string => {
    if (!booking.bookingDate) {
      return 'N/A';
    }

    try {
      // Extract just the date part to avoid timezone issues
      const datePart = booking.bookingDate.split('T')[0];
      const parsed = parseISO(datePart + 'T00:00:00');
      return isValid(parsed) ? formatDate(parsed, 'display') : 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  /**
   * Format a booking's time for display
   */
  const formatBookingTime = (booking: { bookingTime?: string | null }): string => {
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
  };

  /**
   * Update date format preference locally
   */
  const updateDateFormat = (format: DateFormatType) => {
    setDateFormat(format);
  };

  /**
   * Refresh restaurant settings from the server
   */
  const refreshSettings = async () => {
    if (!user?.restaurantId) return;

    try {
      const settings = await restaurantService.getSettings(user.restaurantId);
      setRestaurantSettings(settings);
      
      if (settings.dateFormat) {
        setDateFormat(settings.dateFormat);
      }
    } catch (error) {
      console.error('Error refreshing restaurant settings:', error);
    }
  };

  const contextValue: DateFormatContextType = {
    dateFormat,
    restaurantSettings,
    formatDate,
    formatDateString,
    formatTime,
    formatDateTime,
    formatBookingDate,
    formatBookingTime,
    isLoading,
    updateDateFormat,
    refreshSettings,
  };

  return (
    <DateFormatContext.Provider value={contextValue}>
      {children}
    </DateFormatContext.Provider>
  );
};