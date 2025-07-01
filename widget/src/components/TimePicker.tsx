import React from 'react';
import { TimeSlot } from '../types';
import styles from './BookingForm.module.css';

interface TimePickerProps {
  availableSlots: TimeSlot[];
  onTimeSelect: (time: string) => void;
  selectedTime: string;
  onBack: () => void;
  date: string;
  partySize: number;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  availableSlots,
  onTimeSelect,
  selectedTime,
  onBack,
  date,
  partySize
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const availableSlotsList = availableSlots.filter(slot => slot.available);

  return (
    <div className="time-picker">
      <h3 className={styles.marginBottom}>Select Time</h3>
      
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: 'var(--tb-border-radius)',
        fontSize: '14px'
      }}>
        <div><strong>Date:</strong> {formatDate(date)}</div>
        <div><strong>Party Size:</strong> {partySize} {partySize === 1 ? 'person' : 'people'}</div>
      </div>

      {availableSlotsList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#666'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>😔</div>
          <h4 style={{ margin: '0 0 8px 0' }}>No Available Times</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Sorry, there are no available time slots for this date and party size.
            Please try a different date or party size.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.grid3} style={{ marginBottom: '24px' }}>
            {availableSlotsList.map(slot => (
              <button
                key={slot.time}
                type="button"
                onClick={() => onTimeSelect(slot.time)}
                className={selectedTime === slot.time ? styles.primaryButton : styles.secondaryButton}
                style={{
                  padding: '16px 8px',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                {formatTime(slot.time)}
              </button>
            ))}
          </div>

          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#666'
          }}>
            Times shown are available for your party size
          </div>
        </>
      )}

      <div className={styles.flex}>
        <button
          type="button"
          onClick={onBack}
          className={styles.backButton}
        >
          ← Back
        </button>
        
        {selectedTime && (
          <button
            type="button"
            onClick={() => onTimeSelect(selectedTime)}
            className={styles.primaryButton}
            style={{ flex: 1 }}
          >
            Continue with {formatTime(selectedTime)}
          </button>
        )}
      </div>
    </div>
  );
};

export default TimePicker;