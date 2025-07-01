import React from 'react';
import { RestaurantInfo } from '../types';
import styles from './BookingForm.module.css';

interface ConfirmationProps {
  formData: {
    date: string;
    partySize: number;
    time: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialRequests: string;
  };
  restaurantInfo: RestaurantInfo;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}

export const Confirmation: React.FC<ConfirmationProps> = ({
  formData,
  restaurantInfo,
  onConfirm,
  onBack,
  loading
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="confirmation">
      <h3 className={styles.marginBottom}>Confirm Your Booking</h3>
      
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: 'var(--tb-border-radius)',
        marginBottom: '20px'
      }}>
        <h4 style={{ 
          margin: '0 0 16px 0', 
          color: 'var(--tb-primary-color)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '20px', marginRight: '8px' }}>🍽️</span>
          {restaurantInfo.name}
        </h4>

        <div className="booking-details" style={{ fontSize: '16px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '12px' }}>
            <strong>📅 Date:</strong> {formatDate(formData.date)}
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>🕐 Time:</strong> {formatTime(formData.time)}
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>👥 Party Size:</strong> {formData.partySize} {formData.partySize === 1 ? 'person' : 'people'}
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>👤 Name:</strong> {formData.customerName}
          </div>
          
          {formData.customerEmail && (
            <div style={{ marginBottom: '12px' }}>
              <strong>📧 Email:</strong> {formData.customerEmail}
            </div>
          )}
          
          {formData.customerPhone && (
            <div style={{ marginBottom: '12px' }}>
              <strong>📞 Phone:</strong> {formData.customerPhone}
            </div>
          )}
          
          {formData.specialRequests && (
            <div style={{ marginBottom: '12px' }}>
              <strong>📝 Special Requests:</strong>
              <div style={{ 
                marginTop: '4px', 
                padding: '8px', 
                background: 'white', 
                borderRadius: 'var(--tb-border-radius)',
                fontSize: '14px'
              }}>
                {formData.specialRequests}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Important Information */}
      <div style={{
        background: '#e3f2fd',
        padding: '16px',
        borderRadius: 'var(--tb-border-radius)',
        marginBottom: '24px',
        fontSize: '14px',
        borderLeft: '4px solid var(--tb-primary-color)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>
          📋 Important Information:
        </div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>Please arrive on time for your reservation</li>
          <li>If you need to cancel or modify, please call the restaurant</li>
          <li>Large parties may require a deposit</li>
          <li>We'll hold your table for 15 minutes past your reservation time</li>
        </ul>
      </div>

      {/* Restaurant Contact */}
      {restaurantInfo.phone && (
        <div style={{
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: 'var(--tb-border-radius)',
          marginBottom: '24px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          <strong>Need to contact us?</strong><br />
          📞 {restaurantInfo.phone}
        </div>
      )}

      <div className={styles.flex}>
        <button
          type="button"
          onClick={onBack}
          className={styles.backButton}
          disabled={loading}
        >
          ← Back
        </button>
        
        <button
          type="button"
          onClick={onConfirm}
          className={styles.primaryButton}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className={styles.spinner} style={{ 
                width: '16px', 
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                marginRight: '8px'
              }} />
              Confirming Booking...
            </div>
          ) : (
            '✅ Confirm Booking'
          )}
        </button>
      </div>
    </div>
  );
};

export default Confirmation;