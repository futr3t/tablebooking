import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  CircularProgress,
  Typography,
  Chip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { format, parseISO } from 'date-fns';
import { bookingService, restaurantService } from '../../services/api';
import { Booking, TimeSlot } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking?: Booking | null;
  editMode: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({
  open,
  onClose,
  onSuccess,
  booking,
  editMode,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partySize: 2,
    bookingTime: new Date(),
    specialRequests: '',
    status: 'pending' as Booking['status'],
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

  useEffect(() => {
    if (booking && editMode) {
      setFormData({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail || '',
        customerPhone: booking.customerPhone || '',
        partySize: booking.partySize,
        bookingTime: booking.bookingDate && booking.bookingTime 
          ? parseISO(`${booking.bookingDate}T${booking.bookingTime}`)
          : new Date(),
        specialRequests: booking.specialRequests || '',
        status: booking.status,
      });
    } else {
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        partySize: 2,
        bookingTime: new Date(),
        specialRequests: '',
        status: 'pending',
      });
    }
  }, [booking, editMode, open]);

  useEffect(() => {
    if (user?.restaurantId && open) {
      loadRestaurantSettings();
    }
  }, [user?.restaurantId, open]);

  const loadRestaurantSettings = async () => {
    if (!user?.restaurantId) return;
    
    try {
      const response = await restaurantService.getSettings(user.restaurantId);
      setRestaurantSettings(response);
    } catch (error) {
      console.error('Failed to load restaurant settings:', error);
    }
  };

  const checkAvailability = async () => {
    if (!user?.restaurantId) return;
    
    setCheckingAvailability(true);
    setError('');
    try {
      const date = format(formData.bookingTime, 'yyyy-MM-dd');
      const slots = await bookingService.getAvailability(
        user.restaurantId,
        date,
        formData.partySize
      );
      setAvailableSlots(slots);
    } catch (err: any) {
      console.error('Failed to check availability:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      
      if (errorMessage && (
        errorMessage.includes('Restaurant is closed') || 
        errorMessage.includes('closed on') ||
        errorMessage.includes('outside service hours')
      )) {
        setError(errorMessage);
      } else {
        setError('Failed to check availability. Please try again.');
      }
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurantId) return;

    setLoading(true);
    setError('');

    try {
      // Validate required fields based on restaurant settings
      if (restaurantSettings?.bookingSettings?.requirePhone && !formData.customerPhone) {
        throw new Error('Phone number is required');
      }
      
      if (restaurantSettings?.bookingSettings?.requireEmail && !formData.customerEmail) {
        throw new Error('Email address is required');
      }

      const data = {
        ...formData,
        restaurantId: user.restaurantId,
        bookingDate: format(formData.bookingTime, 'yyyy-MM-dd'),
        bookingTime: format(formData.bookingTime, 'HH:mm:ss'),
      };

      if (editMode && booking) {
        await bookingService.updateBooking(booking.id, data);
      } else {
        await bookingService.createBooking(data);
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>📝 {editMode ? 'Edit Booking (Legacy Form)' : 'New Booking (Legacy Form)'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Guest Name *
              </Typography>
              <TextField
                fullWidth
                value={formData.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                required
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Email{restaurantSettings?.bookingSettings?.requireEmail ? ' *' : ''}
              </Typography>
              <TextField
                fullWidth
                type="email"
                required={restaurantSettings?.bookingSettings?.requireEmail}
                value={formData.customerEmail}
                onChange={(e) => handleChange('customerEmail', e.target.value)}
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Phone{restaurantSettings?.bookingSettings?.requirePhone ? ' *' : ''}
              </Typography>
              <TextField
                fullWidth
                required={restaurantSettings?.bookingSettings?.requirePhone}
                value={formData.customerPhone}
                onChange={(e) => handleChange('customerPhone', e.target.value)}
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Party Size *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={formData.partySize}
                onChange={(e) => handleChange('partySize', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 100 }}
                required
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Booking Date & Time
              </Typography>
              <DateTimePicker
                value={formData.bookingTime}
                onChange={(value) => value && handleChange('bookingTime', value)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    sx: {
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      }
                    }
                  } 
                }}
              />
            </Grid>
            
            {editMode && (
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#cbd5e1', 
                    mb: 0.5, 
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Status
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      }
                    }}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="no_show">No Show</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Special Requests
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.specialRequests}
                onChange={(e) => handleChange('specialRequests', e.target.value)}
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            
            {!editMode && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={checkAvailability}
                  disabled={checkingAvailability}
                  fullWidth
                >
                  {checkingAvailability ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Check Availability'
                  )}
                </Button>
                
                {availableSlots.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      Available time slots:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {availableSlots.map((slot) => (
                        <Chip
                          key={slot.time}
                          label={format(parseISO(slot.time), 'h:mm a')}
                          color={slot.available ? 'success' : 'default'}
                          disabled={!slot.available}
                          onClick={() => {
                            if (slot.available) {
                              handleChange('bookingTime', parseISO(slot.time));
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (editMode ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BookingForm;