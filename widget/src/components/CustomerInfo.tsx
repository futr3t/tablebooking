import React, { useState } from 'react';
import { RestaurantInfo } from '../types';
import styles from './BookingForm.module.css';

interface CustomerInfoProps {
  bookingSettings: RestaurantInfo['bookingSettings'];
  onSubmit: (customerData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialRequests: string;
  }) => void;
  formData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialRequests: string;
  };
  onBack: () => void;
}

export const CustomerInfo: React.FC<CustomerInfoProps> = ({
  bookingSettings,
  onSubmit,
  formData,
  onBack
}) => {
  const [customerName, setCustomerName] = useState(formData.customerName);
  const [customerEmail, setCustomerEmail] = useState(formData.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(formData.customerPhone);
  const [specialRequests, setSpecialRequests] = useState(formData.specialRequests);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name is always required
    if (!customerName.trim()) {
      newErrors.customerName = 'Name is required';
    }

    // Email validation if required
    if (bookingSettings.requireEmail && !customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }

    // Phone validation if required
    if (bookingSettings.requirePhone && !customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (customerPhone.trim() && !/^[\+]?[(]?[\d\s\-\(\)]{10,}$/.test(customerPhone.replace(/\s/g, ''))) {
      newErrors.customerPhone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        specialRequests: specialRequests.trim()
      });
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhone(formatted);
  };

  return (
    <div className="customer-info">
      <h3 className={styles.marginBottom}>Your Information</h3>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Name <span style={{ color: 'var(--tb-error-color)' }}>*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={styles.input}
            placeholder="Enter your full name"
            style={{
              borderColor: errors.customerName ? 'var(--tb-error-color)' : undefined
            }}
          />
          {errors.customerName && (
            <div style={{ color: 'var(--tb-error-color)', fontSize: '14px', marginTop: '4px' }}>
              {errors.customerName}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Email {bookingSettings.requireEmail && <span style={{ color: 'var(--tb-error-color)' }}>*</span>}
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className={styles.input}
            placeholder="Enter your email address"
            style={{
              borderColor: errors.customerEmail ? 'var(--tb-error-color)' : undefined
            }}
          />
          {errors.customerEmail && (
            <div style={{ color: 'var(--tb-error-color)', fontSize: '14px', marginTop: '4px' }}>
              {errors.customerEmail}
            </div>
          )}
          {!bookingSettings.requireEmail && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Optional - for booking confirmations
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Phone {bookingSettings.requirePhone && <span style={{ color: 'var(--tb-error-color)' }}>*</span>}
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={handlePhoneChange}
            className={styles.input}
            placeholder="(555) 123-4567"
            style={{
              borderColor: errors.customerPhone ? 'var(--tb-error-color)' : undefined
            }}
          />
          {errors.customerPhone && (
            <div style={{ color: 'var(--tb-error-color)', fontSize: '14px', marginTop: '4px' }}>
              {errors.customerPhone}
            </div>
          )}
          {!bookingSettings.requirePhone && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Optional - for booking confirmations
            </div>
          )}
        </div>

        {bookingSettings.showSpecialRequests && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Special Requests</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className={styles.textarea}
              placeholder="Any special requests, dietary restrictions, or celebration notes..."
              rows={3}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Optional - let us know about allergies, celebrations, etc.
            </div>
          </div>
        )}

        <div style={{
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: 'var(--tb-border-radius)',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            📋 Booking Details
          </div>
          <div>We'll send you a confirmation with your booking details and any special instructions.</div>
        </div>

        <div className={styles.flex}>
          <button
            type="button"
            onClick={onBack}
            className={styles.backButton}
          >
            ← Back
          </button>
          
          <button
            type="submit"
            className={styles.primaryButton}
            style={{ flex: 1 }}
          >
            Review Booking
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerInfo;