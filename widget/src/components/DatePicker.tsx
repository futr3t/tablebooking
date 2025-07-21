import React, { useState, useEffect } from 'react';
import { RestaurantInfo } from '../types';
import styles from './BookingForm.module.css';

interface DatePickerProps {
  restaurantInfo: RestaurantInfo;
  onDateSelect: (date: string) => void;
  selectedDate: string;
}

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  isToday: boolean;
  isPast: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  restaurantInfo,
  onDateSelect,
  selectedDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, restaurantInfo]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();
    const maxBookingDate = new Date();
    maxBookingDate.setDate(today.getDate() + restaurantInfo.bookingSettings.advanceBookingDays);

    // First day of the month and how many days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Start from the previous Sunday
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];

    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isTooFar = date > maxBookingDate;
      const isToday = date.toDateString() === today.toDateString();

      // Check if restaurant is open on this day
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      const isRestaurantOpen = restaurantInfo.openingHours[dayName]?.isOpen || false;

      const isAvailable = isCurrentMonth && !isPast && !isTooFar && isRestaurantOpen;

      days.push({
        date: dateString,
        day: date.getDate(),
        isCurrentMonth,
        isAvailable,
        isToday,
        isPast
      });
    }

    setCalendarDays(days);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isAvailable) {
      onDateSelect(day.date);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const today = new Date();
  const canGoPrev = currentMonth.getMonth() > today.getMonth() || currentMonth.getFullYear() > today.getFullYear();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + restaurantInfo.bookingSettings.advanceBookingDays);
  const canGoNext = currentMonth < maxDate;

  return (
    <div className="date-picker">
      <h3 className={styles.marginBottom}>Select a Date</h3>

      <div className="calendar">
        {/* Calendar Header */}
        <div className="calendar-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            style={{
              background: 'none',
              border: '1px solid #e5e5e5',
              borderRadius: 'var(--tb-border-radius)',
              fontSize: '18px',
              cursor: canGoPrev ? 'pointer' : 'not-allowed',
              opacity: canGoPrev ? 1 : 0.3,
              padding: '8px 12px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (canGoPrev) {
                e.currentTarget.style.background = 'var(--tb-hover-color)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            ◀
          </button>

          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, textAlign: 'center' }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            style={{
              background: 'none',
              border: '1px solid #e5e5e5',
              borderRadius: 'var(--tb-border-radius)',
              fontSize: '18px',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.3,
              padding: '8px 12px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (canGoNext) {
                e.currentTarget.style.background = 'var(--tb-hover-color)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            ▶
          </button>
        </div>

        {/* Week Days Header */}
        <div className="week-header" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '8px'
        }}>
          {(isMobile ? weekDaysMobile : weekDays).map((day, idx) => (
            <div
              key={`${day}-${idx}`}
              style={{
                textAlign: 'center',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: 600,
                color: '#666',
                padding: isMobile ? '4px 2px' : '8px 4px'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px'
        }}>
          {calendarDays.map((day, index) => {
            const isSelected = selectedDate === day.date;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={!day.isAvailable}
                style={{
                  padding: '8px 2px',
                  minHeight: '40px',
                  border: '1px solid #eee',
                  background: isSelected
                    ? 'var(--tb-primary-color)'
                    : day.isAvailable
                      ? 'white'
                      : '#f9f9f9',
                  color: isSelected
                    ? 'white'
                    : day.isAvailable
                      ? day.isToday
                        ? 'var(--tb-primary-color)'
                        : 'var(--tb-text-color)'
                      : '#ccc',
                  cursor: day.isAvailable ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: day.isToday ? 600 : 400,
                  borderRadius: 'var(--tb-border-radius)',
                  transition: 'all 0.2s ease',
                  opacity: day.isCurrentMonth ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  if (day.isAvailable && !isSelected) {
                    e.currentTarget.style.background = 'var(--tb-hover-color)';
                  }
                }}
                onMouseOut={(e) => {
                  if (day.isAvailable && !isSelected) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {day.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Restaurant Hours Info */}
      <div style={{
        marginTop: '20px',
        padding: isMobile ? '10px' : '12px',
        background: '#f8f9fa',
        borderRadius: 'var(--tb-border-radius)',
        fontSize: isMobile ? '12px' : '14px'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Restaurant Hours:</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '4px'
        }}>
          {Object.entries(restaurantInfo.openingHours).map(([day, hours]) => {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            return (
              <div key={day} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: isMobile ? '4px 0' : '2px 0'
              }}>
                <span>{dayName}:</span>
                <span style={{ fontWeight: 500 }}>
                  {hours.isOpen
                    ? `${hours.openTime} - ${hours.closeTime}`
                    : 'Closed'
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
