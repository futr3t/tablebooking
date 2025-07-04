import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
  Stack,
  Collapse,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import {
  CalendarMonth,
  AccessTime,
  Person,
  Phone,
  Email,
  Restaurant,
  Cake,
  Warning,
  CheckCircle,
  Star,
  ExpandMore,
  ExpandLess,
  LocalDining,
  EventSeat
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, parseISO } from 'date-fns';
import { Booking, BookingTemplate, DietaryRequirement, EnhancedAvailability, EnhancedTimeSlot, Table } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface OptimizedBookingFormProps {
  restaurantId: string;
  onSuccess: (booking: Booking) => void;
  onCancel: () => void;
  booking?: Booking | null;
  editMode?: boolean;
}

const OCCASIONS = [
  { value: 'birthday', label: 'Birthday', icon: '🎂' },
  { value: 'anniversary', label: 'Anniversary', icon: '💑' },
  { value: 'business', label: 'Business Meeting', icon: '💼' },
  { value: 'date', label: 'Date Night', icon: '❤️' },
  { value: 'family', label: 'Family Gathering', icon: '👨‍👩‍👧‍👦' },
  { value: 'celebration', label: 'Celebration', icon: '🎉' },
  { value: 'casual', label: 'Casual Dining', icon: '🍽️' },
  { value: 'special', label: 'Special Event', icon: '✨' }
];

const SEATING_PREFERENCES = [
  'Window table',
  'Quiet area',
  'Near bar',
  'Private booth',
  'Patio/outdoor',
  'High visibility',
  'Wheelchair accessible',
  'Away from kitchen'
];

export const OptimizedBookingForm: React.FC<OptimizedBookingFormProps> = ({
  restaurantId,
  onSuccess,
  onCancel,
  booking,
  editMode = false
}) => {
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    bookingDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    bookingTime: '',
    duration: 120,
    dietaryRequirements: [] as string[],
    customDietary: '',
    occasion: '',
    preferredSeating: '',
    specialRequests: '',
    marketingConsent: false,
    isVip: false,
    internalNotes: '',
    overridePacing: false,
    overrideReason: '',
    tableId: ''
  });

  // UI state
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [suggestedTableId, setSuggestedTableId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<BookingTemplate[]>([]);
  const [dietaryOptions, setDietaryOptions] = useState<DietaryRequirement[]>([]);
  const [availability, setAvailability] = useState<EnhancedAvailability | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EnhancedTimeSlot | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Load dietary requirements on mount
  useEffect(() => {
    loadDietaryRequirements();
  }, []);

  // Populate form data when editing
  useEffect(() => {
    if (booking && editMode) {
      const bookingDate = booking.bookingDate || format(parseISO(booking.bookingTime), 'yyyy-MM-dd');
      const bookingTime = booking.bookingTime ? format(parseISO(booking.bookingTime), 'HH:mm') : '';
      
      setFormData({
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerEmail: booking.customerEmail || '',
        partySize: booking.partySize || 2,
        bookingDate,
        bookingTime,
        duration: booking.duration || 120,
        dietaryRequirements: booking.dietaryRequirements ? booking.dietaryRequirements.split(', ') : [],
        customDietary: '',
        occasion: booking.occasion || '',
        preferredSeating: booking.preferredSeating || '',
        specialRequests: booking.specialRequests || '',
        marketingConsent: booking.marketingConsent || false,
        isVip: booking.isVip || false,
        internalNotes: booking.internalNotes || '',
        overridePacing: false,
        overrideReason: '',
        tableId: booking.tableId || ''
      });
    }
  }, [booking, editMode]);

  // Load availability when date or party size changes
  useEffect(() => {
    if (formData.bookingDate && formData.partySize) {
      loadAvailability();
    }
  }, [formData.bookingDate, formData.partySize]);

  // Load available tables when time is selected
  useEffect(() => {
    if (formData.bookingTime && formData.bookingDate && formData.partySize) {
      loadAvailableTables();
    }
  }, [formData.bookingTime, formData.bookingDate, formData.partySize]);

  const loadDietaryRequirements = async () => {
    try {
      const response = await api.get('/dietary-requirements');
      setDietaryOptions(response.data.data);
    } catch (error) {
      console.error('Failed to load dietary requirements:', error);
    }
  };

  const loadAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const response = await api.get('/bookings/staff/availability', {
        params: {
          restaurantId,
          date: formData.bookingDate,
          partySize: formData.partySize,
          preferredTime: formData.bookingTime || undefined
        }
      });
      setAvailability(response.data.data);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const loadAvailableTables = async () => {
    if (!formData.bookingTime || !formData.bookingDate) {
      setAvailableTables([]);
      return;
    }

    try {
      const response = await api.get('/bookings/staff/tables/available', {
        params: {
          restaurantId,
          date: formData.bookingDate,
          time: formData.bookingTime,
          partySize: formData.partySize
        }
      });
      
      const { availableTables, suggestedTable } = response.data.data;
      setAvailableTables(availableTables);
      
      // Auto-select suggested table if no table is selected
      if (suggestedTable && !formData.tableId) {
        setSuggestedTableId(suggestedTable.id);
        setFormData(prev => ({ ...prev, tableId: suggestedTable.id }));
      }
    } catch (error) {
      console.error('Failed to load available tables:', error);
      setAvailableTables([]);
    }
  };

  const searchCustomers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    setLoadingCustomer(true);
    try {
      const response = await api.get(`/bookings/staff/customers/${restaurantId}`, {
        params: { search: searchTerm }
      });
      setCustomerSuggestions(response.data.data);
    } catch (error) {
      console.error('Failed to search customers:', error);
    } finally {
      setLoadingCustomer(false);
    }
  }, [restaurantId]);

  const handleCustomerSelect = (template: BookingTemplate | null) => {
    if (template) {
      setFormData(prev => ({
        ...prev,
        customerName: template.customerName,
        customerPhone: template.customerPhone,
        customerEmail: template.customerEmail || '',
        dietaryRequirements: template.dietaryRequirements?.split(', ') || [],
        preferredSeating: template.preferredSeating || '',
        specialRequests: template.specialRequests || '',
        isVip: template.isVip,
        partySize: template.preferredPartySize || prev.partySize
      }));
    }
  };

  const handleTimeSlotSelect = (slot: EnhancedTimeSlot) => {
    setSelectedSlot(slot);
    setFormData(prev => ({ ...prev, bookingTime: slot.time }));
    
    // Show warning if slot is busy
    if (slot.pacingStatus === 'busy' || slot.pacingStatus === 'full') {
      setShowAdvanced(true);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine dietary requirements
      const allDietary = [
        ...formData.dietaryRequirements,
        formData.customDietary
      ].filter(Boolean).join(', ');

      const bookingData = {
        restaurantId,
        ...formData,
        dietaryRequirements: allDietary,
        source: 'staff' as const,
        createdBy: user?.id
      };

      let response;
      if (editMode && booking) {
        // Update existing booking
        response = await api.put(`/bookings/${booking.id}`, bookingData);
      } else {
        // Create new booking
        response = await api.post('/bookings/staff', bookingData);
      }
      
      onSuccess(response.data.data);
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} booking`);
    } finally {
      setLoading(false);
    }
  };

  const getPacingColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'moderate': return 'warning';
      case 'busy': return 'error';
      case 'full': return 'error';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
          🚀 {editMode ? 'Edit Booking (Enhanced Form)' : 'Enhanced Booking Form'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Customer Information */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> Customer Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={customerSuggestions}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : `${option.customerName} (${option.customerPhone})`
                    }
                    onInputChange={(_, value) => {
                      setFormData(prev => ({ ...prev, customerName: value }));
                      searchCustomers(value);
                    }}
                    onChange={(_, value) => handleCustomerSelect(value as BookingTemplate)}
                    loading={loadingCustomer}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">
                              {option.customerName}
                              {option.isVip && <Star sx={{ ml: 1, fontSize: 16, color: 'gold' }} />}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.totalBookings} bookings
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {option.customerPhone}
                            {option.dietaryRequirements && ` • ${option.dietaryRequirements}`}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer Name"
                        required
                        autoFocus
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>

                {formData.isVip && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<Star />}>
                      VIP Customer - Total bookings: {customerSuggestions.find(c => c.isVip)?.totalBookings || 'N/A'}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Booking Details */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonth /> Booking Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Date"
                    value={parseISO(formData.bookingDate)}
                    onChange={(date) => date && setFormData(prev => ({ 
                      ...prev, 
                      bookingDate: format(date, 'yyyy-MM-dd') 
                    }))}
                    minDate={new Date()}
                    maxDate={addDays(new Date(), 270)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Party Size"
                    type="number"
                    required
                    value={formData.partySize}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      partySize: parseInt(e.target.value) || 1 
                    }))}
                    InputProps={{
                      inputProps: { min: 1, max: 50 },
                      startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Occasion</InputLabel>
                    <Select
                      value={formData.occasion}
                      onChange={(e) => setFormData(prev => ({ ...prev, occasion: e.target.value }))}
                      startAdornment={<Cake sx={{ ml: 1, mr: 0.5, color: 'action.active' }} />}
                    >
                      <MenuItem value="">None</MenuItem>
                      {OCCASIONS.map(occ => (
                        <MenuItem key={occ.value} value={occ.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{occ.icon}</span>
                            {occ.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      duration: parseInt(e.target.value) || 120 
                    }))}
                    InputProps={{
                      inputProps: { min: 30, max: 480, step: 30 }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Time Slot Selection */}
              <Box sx={{ mt: 3, p: 2, border: '2px dashed #2563eb', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  🕐 Time & Table Selection
                </Typography>
                
                {!formData.bookingDate || !formData.partySize ? (
                  <Alert severity="info">
                    Please select a date and party size to see available times
                  </Alert>
                ) : loadingAvailability ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Loading available times...</Typography>
                  </Box>
                ) : availability ? (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Select Time
                    </Typography>
                  
                  {availability.suggestions.bestAvailability.length > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Recommended times: {availability.suggestions.bestAvailability.join(', ')}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availability.timeSlots.map((slot) => (
                      <Chip
                        key={slot.time}
                        label={slot.time}
                        color={getPacingColor(slot.pacingStatus)}
                        variant={formData.bookingTime === slot.time ? 'filled' : 'outlined'}
                        onClick={() => handleTimeSlotSelect(slot)}
                        disabled={!slot.available && !formData.overridePacing}
                        icon={
                          slot.pacingStatus === 'full' ? <Warning /> :
                          slot.pacingStatus === 'busy' ? <AccessTime /> :
                          <CheckCircle />
                        }
                        sx={{ 
                          cursor: slot.available || formData.overridePacing ? 'pointer' : 'not-allowed',
                          '&:hover': {
                            backgroundColor: slot.available || formData.overridePacing ? undefined : 'transparent'
                          }
                        }}
                      />
                    ))}
                  </Box>

                  {selectedSlot && selectedSlot.alternativeTimes && selectedSlot.alternativeTimes.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      This time is busy. Alternative times: {selectedSlot.alternativeTimes.join(', ')}
                    </Alert>
                  )}
                  </Box>
                ) : (
                  <Alert severity="warning">
                    No available times found. Please try a different date or party size.
                  </Alert>
                )}
              </Box>

              {/* Table Selection */}
              {formData.bookingTime && availableTables.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Table
                  </Typography>
                  
                  <FormControl fullWidth>
                    <Select
                      value={formData.tableId}
                      onChange={(e) => setFormData(prev => ({ ...prev, tableId: e.target.value }))}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Auto-assign table</em>
                      </MenuItem>
                      {availableTables.map((table) => (
                        <MenuItem 
                          key={table.id} 
                          value={table.id}
                          sx={{
                            backgroundColor: table.id === suggestedTableId ? 'action.hover' : 'transparent',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>
                              Table {table.number} 
                              {table.id === suggestedTableId && ' (Recommended)'}
                            </span>
                            <Box component="span" sx={{ color: 'text.secondary', ml: 2 }}>
                              {table.minCapacity}-{table.maxCapacity} guests • {table.tableType}
                              {table.notes && ` • ${table.notes}`}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {availableTables.length} table{availableTables.length !== 1 ? 's' : ''} available
                    </FormHelperText>
                  </FormControl>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Dietary & Preferences */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalDining /> Dietary Requirements & Preferences
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={dietaryOptions}
                    getOptionLabel={(option) => option.name}
                    value={dietaryOptions.filter(d => formData.dietaryRequirements.includes(d.name))}
                    onChange={(_, values) => setFormData(prev => ({
                      ...prev,
                      dietaryRequirements: values.map(v => v.name)
                    }))}
                    groupBy={(option) => option.category}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          label={option.name}
                          color={option.severity === 'life_threatening' ? 'error' : 'default'}
                          icon={option.severity === 'life_threatening' ? <Warning /> : undefined}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Dietary Requirements"
                        placeholder="Select or type..."
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Additional Dietary Notes"
                    value={formData.customDietary}
                    onChange={(e) => setFormData(prev => ({ ...prev, customDietary: e.target.value }))}
                    placeholder="Any other allergies or requirements..."
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={SEATING_PREFERENCES}
                    value={formData.preferredSeating}
                    onChange={(_, value) => setFormData(prev => ({ 
                      ...prev, 
                      preferredSeating: value || '' 
                    }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seating Preference"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <EventSeat sx={{ mr: 1, color: 'action.active' }} />
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Special Requests"
                    multiline
                    rows={2}
                    value={formData.specialRequests}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Advanced Options */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="h6">
                  Advanced Options
                </Typography>
                <IconButton>
                  {showAdvanced ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={showAdvanced}>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Internal Notes (Staff Only)"
                      multiline
                      rows={2}
                      value={formData.internalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                      helperText="These notes are only visible to staff"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.marketingConsent}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              marketingConsent: e.target.checked 
                            }))}
                          />
                        }
                        label="Customer consents to marketing communications"
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.isVip}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              isVip: e.target.checked 
                            }))}
                          />
                        }
                        label="Mark as VIP customer"
                      />

                      {selectedSlot && (selectedSlot.pacingStatus === 'busy' || selectedSlot.pacingStatus === 'full') && (
                        <>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.overridePacing}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  overridePacing: e.target.checked 
                                }))}
                                color="warning"
                              />
                            }
                            label="Override pacing limits"
                          />
                          
                          {formData.overridePacing && (
                            <TextField
                              fullWidth
                              label="Override Reason"
                              required
                              value={formData.overrideReason}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                overrideReason: e.target.value 
                              }))}
                              helperText="Please provide a reason for overriding"
                              color="warning"
                            />
                          )}
                        </>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Collapse>
            </Paper>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !formData.customerName || !formData.bookingTime}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {editMode ? 'Update Booking' : 'Create Booking'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};