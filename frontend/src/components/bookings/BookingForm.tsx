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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { bookingService } from '../../services/api';
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
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    party_size: 2,
    booking_time: new Date(),
    special_requests: '',
    status: 'pending' as Booking['status'],
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (booking && editMode) {
      setFormData({
        guest_name: booking.guest_name,
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        party_size: booking.party_size,
        booking_time: parseISO(booking.booking_time),
        special_requests: booking.special_requests || '',
        status: booking.status,
      });
    } else {
      setFormData({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        party_size: 2,
        booking_time: new Date(),
        special_requests: '',
        status: 'pending',
      });
    }
  }, [booking, editMode, open]);

  const checkAvailability = async () => {
    if (!user?.restaurantId) return;
    
    setCheckingAvailability(true);
    try {
      const date = format(formData.booking_time, 'yyyy-MM-dd');
      const slots = await bookingService.getAvailability(
        user.restaurantId,
        date,
        formData.party_size
      );
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Failed to check availability:', err);
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
      const data = {
        ...formData,
        restaurantId: user.restaurantId,
        booking_time: formData.booking_time.toISOString(),
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
        <DialogTitle>{editMode ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Guest Name"
                value={formData.guest_name}
                onChange={(e) => handleChange('guest_name', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.guest_email}
                onChange={(e) => handleChange('guest_email', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.guest_phone}
                onChange={(e) => handleChange('guest_phone', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Party Size"
                type="number"
                value={formData.party_size}
                onChange={(e) => handleChange('party_size', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Booking Date & Time"
                  value={formData.booking_time}
                  onChange={(value) => value && handleChange('booking_time', value)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            {editMode && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
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
              <TextField
                fullWidth
                label="Special Requests"
                multiline
                rows={3}
                value={formData.special_requests}
                onChange={(e) => handleChange('special_requests', e.target.value)}
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
                              handleChange('booking_time', parseISO(slot.time));
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