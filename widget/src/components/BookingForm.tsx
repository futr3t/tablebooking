import React, { useState, useEffect } from 'react';
import { WidgetAPI } from '../api';
import { RestaurantInfo, TimeSlot, BookingRequest } from '../types';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import PartySize from './PartySize';
import CustomerInfo from './CustomerInfo';
import Confirmation from './Confirmation';
import styles from './BookingForm.module.css';

interface BookingFormProps {
  api: WidgetAPI;
  theme: RestaurantInfo['theme'];
}

type FormStep = 'date' | 'party' | 'time' | 'customer' | 'confirmation' | 'success';

interface FormData {
  date: string;
  partySize: number;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({ api, theme }) => {
  const [step, setStep] = useState<FormStep>('date');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [confirmationCode, setConfirmationCode] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    date: '',
    partySize: 2,
    time: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequests: ''
  });

  // Apply theme CSS custom properties
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--tb-primary-color', theme.primaryColor);
      root.style.setProperty('--tb-secondary-color', theme.secondaryColor);
      root.style.setProperty('--tb-font-family', theme.fontFamily);
      root.style.setProperty('--tb-border-radius', theme.borderRadius);
    }
  }, [theme]);

  // Load restaurant info on mount
  useEffect(() => {
    const loadRestaurantInfo = async () => {
      try {
        setLoading(true);
        const info = await api.getRestaurantInfo();
        setRestaurantInfo(info);
      } catch (err: any) {
        setError('Failed to load restaurant information');
        console.error('Error loading restaurant info:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurantInfo();
  }, [api]);

  const handleDateSelect = (date: string) => {
    setFormData({ ...formData, date });
    setStep('party');
  };

  const handlePartySizeSelect = async (partySize: number) => {
    setFormData({ ...formData, partySize });
    setLoading(true);
    setError('');

    try {
      const slots = await api.getAvailability(formData.date, partySize);
      setAvailableSlots(slots);
      setStep('time');
    } catch (err: any) {
      setError('Failed to load available times');
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, time });
    setStep('customer');
  };

  const handleCustomerInfo = (customerData: Partial<FormData>) => {
    setFormData({ ...formData, ...customerData });
    setStep('confirmation');
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    setError('');

    try {
      const bookingRequest: BookingRequest = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        partySize: formData.partySize,
        bookingDate: formData.date,
        bookingTime: formData.time,
        specialRequests: formData.specialRequests || undefined
      };

      const response = await api.createBooking(bookingRequest);
      setConfirmationCode(response.confirmationCode);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      console.error('Error creating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    switch (step) {
      case 'party':
        setStep('date');
        break;
      case 'time':
        setStep('party');
        break;
      case 'customer':
        setStep('time');
        break;
      case 'confirmation':
        setStep('customer');
        break;
    }
  };

  const handleStartOver = () => {
    setStep('date');
    setFormData({
      date: '',
      partySize: 2,
      time: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      specialRequests: ''
    });
    setError('');
    setConfirmationCode('');
    setAvailableSlots([]);
  };

  if (loading && !restaurantInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!restaurantInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Unable to load booking form</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Book a Table</h2>
        <p className={styles.restaurantName}>{restaurantInfo.name}</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.content}>
        {step === 'date' && (
          <DatePicker
            restaurantInfo={restaurantInfo}
            onDateSelect={handleDateSelect}
            selectedDate={formData.date}
          />
        )}

        {step === 'party' && (
          <PartySize
            maxPartySize={restaurantInfo.bookingSettings.maxPartySize}
            onPartySizeSelect={handlePartySizeSelect}
            selectedSize={formData.partySize}
            onBack={handleBack}
            loading={loading}
          />
        )}

        {step === 'time' && (
          <TimePicker
            availableSlots={availableSlots}
            onTimeSelect={handleTimeSelect}
            selectedTime={formData.time}
            onBack={handleBack}
            date={formData.date}
            partySize={formData.partySize}
          />
        )}

        {step === 'customer' && (
          <CustomerInfo
            bookingSettings={restaurantInfo.bookingSettings}
            onSubmit={handleCustomerInfo}
            formData={formData}
            onBack={handleBack}
          />
        )}

        {step === 'confirmation' && (
          <Confirmation
            formData={formData}
            restaurantInfo={restaurantInfo}
            onConfirm={handleConfirmBooking}
            onBack={handleBack}
            loading={loading}
          />
        )}

        {step === 'success' && (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h3>Booking Confirmed!</h3>
            <p>Your confirmation code is: <strong>{confirmationCode}</strong></p>
            <p>Please save this code for your records.</p>
            <button 
              className={styles.primaryButton}
              onClick={handleStartOver}
            >
              Make Another Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingForm;