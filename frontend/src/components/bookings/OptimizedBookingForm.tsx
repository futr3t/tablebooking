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
  EventSeat,
  Close
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, addDays, parseISO } from 'date-fns';
import { Booking, BookingTemplate, DietaryRequirement, EnhancedAvailability, EnhancedTimeSlot, Table } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api, { restaurantService } from '../../services/api';
import OverrideDialog from './OverrideDialog';

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
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [dynamicDuration, setDynamicDuration] = useState<number | null>(null);
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean;
    slot: EnhancedTimeSlot | null;
  }>({ open: false, slot: null });

  // Load dietary requirements and restaurant settings on mount
  useEffect(() => {
    loadDietaryRequirements();
    loadRestaurantSettings();
  }, []);

  const loadRestaurantSettings = async () => {
    try {
      const response = await restaurantService.getSettings(restaurantId);
      setRestaurantSettings(response);
    } catch (error) {
      console.error('Failed to load restaurant settings:', error);
    }
  };

  // Populate form data when editing
  useEffect(() => {
    if (booking && editMode) {
      const bookingDate = booking.bookingDate || '';
      const bookingTime = booking.bookingTime || '';
      
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
      // Update duration based on party size
      if (availability && availability.timeSlots.length > 0) {
        // The availability response might include duration info in future
        // For now, use the restaurant settings or defaults
        const turnTimeRules = restaurantSettings?.turnTimeRules || [];
        const matchingRule = turnTimeRules.find((rule: any) => 
          formData.partySize >= rule.minPartySize && formData.partySize <= rule.maxPartySize
        );
        
        if (matchingRule) {
          setDynamicDuration(matchingRule.turnTimeMinutes);
          setFormData(prev => ({ ...prev, duration: matchingRule.turnTimeMinutes }));
        } else {
          // Default to 120 minutes when no turn time rule is found
          setDynamicDuration(120);
          setFormData(prev => ({ ...prev, duration: 120 }));
        }
      }
    }
  }, [formData.bookingDate, formData.partySize, restaurantSettings]);

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
    setAvailability(null);
    setError(null);
    
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
    } catch (error: any) {
      console.error('Failed to load availability:', error);
      
      // Check if it's a restaurant closed error
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      
      if (errorMessage && (
        errorMessage.includes('Restaurant is closed') || 
        errorMessage.includes('closed on') ||
        errorMessage.includes('outside service hours')
      )) {
        setError(errorMessage);
      } else {
        setError('Failed to load availability. Please try again.');
      }
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
    // Check if physically full - should not be clickable but just in case
    if (slot.pacingStatus === 'physically_full') {
      setError('This time slot has no available tables. Please select a different time or contact the restaurant for large group bookings.');
      return;
    }

    // If slot is pacing_full or full, show override dialog
    if (slot.pacingStatus === 'pacing_full' || slot.pacingStatus === 'full') {
      setOverrideDialog({ open: true, slot });
    } else {
      // All other statuses (available, moderate, busy) are OK to book
      setSelectedSlot(slot);
      setFormData(prev => ({ ...prev, bookingTime: slot.time }));
      
      // Show advanced options if slot is getting busy
      if (slot.pacingStatus === 'busy') {
        setShowAdvanced(true);
      }
    }
  };

  const handleOverrideConfirm = (reason: string) => {
    if (overrideDialog.slot) {
      setSelectedSlot(overrideDialog.slot);
      setFormData(prev => ({ 
        ...prev, 
        bookingTime: overrideDialog.slot!.time,
        overridePacing: true,
        overrideReason: reason
      }));
      setShowAdvanced(true);
    }
    setOverrideDialog({ open: false, slot: null });
  };

  const handleOverrideCancel = () => {
    setOverrideDialog({ open: false, slot: null });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate required fields based on restaurant settings
      if (restaurantSettings?.bookingSettings?.requirePhone && !formData.customerPhone) {
        throw new Error('Phone number is required');
      }
      
      if (restaurantSettings?.bookingSettings?.requireEmail && !formData.customerEmail) {
        throw new Error('Email address is required');
      }

      // CRITICAL: Re-check availability before submission to prevent race conditions
      if (!editMode) { // Only for new bookings, not edits
        console.log('Re-checking availability before booking submission...');
        
        try {
          const currentAvailability = await api.get('/bookings/staff/availability', {
            params: {
              restaurantId,
              date: formData.bookingDate,
              partySize: formData.partySize
            }
          });

          const availableSlots = currentAvailability.data.data.timeSlots;
          const requestedSlot = availableSlots.find((slot: any) => slot.time === formData.bookingTime);

          if (!requestedSlot) {
            throw new Error('Selected time slot is no longer available. Please refresh and select a different time.');
          }

          // Check if slot became physically unavailable
          if (requestedSlot.pacingStatus === 'physically_full') {
            throw new Error(`The ${formData.bookingTime} time slot is now fully booked. Please select a different time or add to waitlist.`);
          }

          // Check if slot requires override but none provided
          if ((requestedSlot.pacingStatus === 'pacing_full' || requestedSlot.pacingStatus === 'full') 
              && !formData.overridePacing) {
            // Update availability state to show current status
            setAvailability(currentAvailability.data.data);
            throw new Error(`The ${formData.bookingTime} time slot now requires an override due to capacity limits. Please check "Override pacing limits" and provide a reason.`);
          }

          // Warn if slot became busy but allow booking
          if (requestedSlot.pacingStatus === 'busy' && selectedSlot?.pacingStatus === 'available') {
            console.log('Warning: Selected slot became busy since initial selection');
            // Could show a warning but still allow booking
          }

          console.log(`✓ Availability confirmed for ${formData.bookingTime} (status: ${requestedSlot.pacingStatus})`);
          
        } catch (availabilityError: any) {
          // If it's a validation error from our checks, throw it
          if (availabilityError.message && !availabilityError.response) {
            throw availabilityError;
          }
          
          // If it's an API error, show generic message
          console.error('Failed to re-check availability:', availabilityError);
          throw new Error('Unable to verify availability. Please refresh the page and try again.');
        }
      }

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
      console.error('Booking creation/update error:', error.response?.data || error);
      
      // Enhanced error handling for concurrent booking conflicts
      const errorResponse = error.response?.data;
      let errorMessage = error.message;

      if (errorResponse) {
        // Backend returned specific error
        errorMessage = errorResponse.error || errorResponse.message;
        
        // Handle specific concurrent booking error codes
        if (errorResponse.code === 'BOOKING_CONFLICT' || errorResponse.code === 'TABLE_UNAVAILABLE') {
          errorMessage = `${errorMessage} Please refresh availability and select a different time.`;
          // Trigger availability refresh
          if (formData.bookingDate && formData.partySize) {
            loadAvailability();
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Failed to ${editMode ? 'update' : 'create'} booking`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPacingColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';        // Green - OK to book
      case 'moderate': return 'success';         // Green - OK to book
      case 'busy': return 'success';             // Green - OK to book (still has tables)
      case 'full': return 'warning';             // Amber - pacing full (legacy)
      case 'pacing_full': return 'warning';      // Amber - pacing full, can override
      case 'physically_full': return 'error';    // Red - no tables available
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'moderate': return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'busy': return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'pacing_full': return <Warning sx={{ fontSize: 16, color: 'warning.main' }} />;
      case 'physically_full': return <Close sx={{ fontSize: 16, color: 'error.main' }} />;
      default: return null;
    }
  };

  const getStatusTooltip = (slot: EnhancedTimeSlot) => {
    const { pacingStatus, tablesAvailable, alternativeTimes } = slot;
    
    switch (pacingStatus) {
      case 'available':
        return `✓ ${tablesAvailable} tables available - optimal booking time`;
      case 'moderate':
        return `✓ ${tablesAvailable} tables available - good time to book`;
      case 'busy':
        return `✓ ${tablesAvailable} tables available - busy but OK to book`;
      case 'pacing_full':
        return `⚠ ${tablesAvailable} tables available - pacing limit reached (override required)`;
      case 'physically_full':
        return alternativeTimes && alternativeTimes.length > 0 
          ? `✗ No tables available - try ${alternativeTimes.slice(0, 2).join(', ')}`
          : '✗ No tables available - restaurant fully booked';
      default:
        return `${tablesAvailable} tables available`;
    }
  };

  return (
    <>
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
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Customer Name *
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={customerSuggestions}
                    value={formData.customerName}
                    inputValue={formData.customerName}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : option.customerName
                    }
                    onInputChange={(_, value, reason) => {
                      // Update the customer name in form data
                      setFormData(prev => ({ ...prev, customerName: value || '' }));
                      // Only search when user is typing, not when clearing
                      if (reason === 'input' && value) {
                        searchCustomers(value);
                      }
                    }}
                    onChange={(_, value) => {
                      if (typeof value === 'string') {
                        // User typed a custom value
                        setFormData(prev => ({ ...prev, customerName: value }));
                      } else if (value) {
                        // User selected from dropdown
                        handleCustomerSelect(value as BookingTemplate);
                      }
                    }}
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
                        required
                        autoFocus
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                        }}
                        sx={{
                          '& .MuiInputLabel-root': {
                            display: 'none', // Hide floating label
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Phone Number{restaurantSettings?.bookingSettings?.requirePhone ? ' *' : ''}
                  </Typography>
                  <TextField
                    fullWidth
                    required={restaurantSettings?.bookingSettings?.requirePhone}
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none', // Hide floating label
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none', // Hide floating label
                      }
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
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Date *
                  </Typography>
                  <DatePicker
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
                        required: true,
                        placeholder: 'dd/MM/yyyy',
                        sx: {
                          '& .MuiInputBase-root': {
                            height: '40px',
                            minHeight: '40px',
                            backgroundColor: '#334155',
                            borderRadius: 0,
                          },
                          '& .MuiInputBase-input': {
                            padding: '8px 14px',
                            lineHeight: '24px',
                            height: '24px',
                            color: '#ffffff',
                            fontSize: '1rem',
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#475569',
                          },
                          '& .MuiInputLabel-root': {
                            display: 'none', // Hide the floating label completely
                          }
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
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
                    required
                    value={formData.partySize}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      partySize: parseInt(e.target.value) || 1 
                    }))}
                    InputProps={{
                      inputProps: { min: 1, max: 100 },
                      startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none', // Hide floating label
                      }
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
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Duration
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      duration: parseInt(e.target.value) || 120 
                    }))}
                    InputProps={{
                      inputProps: { min: 30, max: 480, step: 30 },
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          min
                        </Typography>
                      )
                    }}
                    helperText={
                      dynamicDuration && dynamicDuration !== formData.duration
                        ? `Default for ${formData.partySize} ${formData.partySize === 1 ? 'person' : 'people'}: ${dynamicDuration} min`
                        : `${Math.floor(formData.duration / 60)}h ${formData.duration % 60}m`
                    }
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none', // Hide floating label
                      }
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
                ) : error ? (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      {error}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please select a different date when the restaurant is open.
                    </Typography>
                  </Alert>
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
                      <Tooltip 
                        key={slot.time}
                        title={getStatusTooltip(slot)}
                        placement="top"
                        arrow
                      >
                        <span>
                          <Chip
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {slot.time}
                                {getStatusIcon(slot.pacingStatus)}
                              </Box>
                            }
                            color={getPacingColor(slot.pacingStatus)}
                            variant={formData.bookingTime === slot.time ? 'filled' : 'outlined'}
                            onClick={slot.pacingStatus === 'physically_full' ? undefined : () => handleTimeSlotSelect(slot)}
                            disabled={slot.pacingStatus === 'physically_full'}
                            sx={{ 
                              cursor: slot.pacingStatus === 'physically_full' ? 'not-allowed' : 'pointer',
                              opacity: slot.pacingStatus === 'physically_full' ? 0.5 : 1,
                              '&:hover': {
                                opacity: slot.pacingStatus === 'physically_full' ? 0.5 : 1,
                                transform: slot.pacingStatus === 'physically_full' ? 'none' : 'scale(1.05)',
                                boxShadow: slot.pacingStatus === 'physically_full' ? 'none' : '0 2px 8px rgba(0,0,0,0.2)'
                              },
                              '&.Mui-disabled': {
                                opacity: 0.5,
                                color: 'text.disabled'
                              },
                              transition: 'all 0.2s ease',
                              minWidth: '80px',
                              fontWeight: formData.bookingTime === slot.time ? 600 : 400
                            }}
                          />
                        </span>
                      </Tooltip>
                    ))}
                  </Box>

                  {selectedSlot && selectedSlot.alternativeTimes && selectedSlot.alternativeTimes.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedSlot.pacingStatus === 'busy' ? '⚠️ Busy Time Selected' : '🔴 Override Required'}
                        </Typography>
                        <Typography variant="body2">
                          Alternative times with better availability: {selectedSlot.alternativeTimes.join(', ')}
                        </Typography>
                      </Box>
                    </Alert>
                  )}

                  {/* Real-time availability status */}
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Last checked: {new Date().toLocaleTimeString()}
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={loadAvailability}
                      disabled={loadingAvailability}
                      startIcon={loadingAvailability ? <CircularProgress size={16} /> : null}
                    >
                      Refresh Availability
                    </Button>
                  </Box>
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
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Dietary Requirements
                  </Typography>
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
                        placeholder="Select or type..."
                        sx={{
                          '& .MuiInputLabel-root': {
                            display: 'none',
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Additional Dietary Notes
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.customDietary}
                    onChange={(e) => setFormData(prev => ({ ...prev, customDietary: e.target.value }))}
                    placeholder="Any other allergies or requirements..."
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#cbd5e1', 
                      mb: 0.5, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Seating Preference
                  </Typography>
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
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <EventSeat sx={{ mr: 1, color: 'action.active' }} />
                        }}
                        sx={{
                          '& .MuiInputLabel-root': {
                            display: 'none',
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
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
                    rows={2}
                    value={formData.specialRequests}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      }
                    }}
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
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#cbd5e1', 
                        mb: 0.5, 
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      Internal Notes (Staff Only)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.internalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                      helperText="These notes are only visible to staff"
                      sx={{
                        '& .MuiInputLabel-root': {
                          display: 'none',
                        }
                      }}
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
                            <>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#cbd5e1', 
                                  mb: 0.5, 
                                  fontSize: '0.875rem',
                                  fontWeight: 500
                                }}
                              >
                                Override Reason *
                              </Typography>
                              <TextField
                                fullWidth
                                required
                                value={formData.overrideReason}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  overrideReason: e.target.value 
                                }))}
                                helperText="Please provide a reason for overriding"
                                color="warning"
                                sx={{
                                  '& .MuiInputLabel-root': {
                                    display: 'none',
                                  }
                                }}
                              />
                            </>
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
                disabled={loading || !formData.customerName || !formData.bookingTime || 
                  (restaurantSettings?.bookingSettings?.requirePhone && !formData.customerPhone) ||
                  (restaurantSettings?.bookingSettings?.requireEmail && !formData.customerEmail)
                }
                startIcon={loading && <CircularProgress size={20} />}
              >
                {editMode ? 'Update Booking' : 'Create Booking'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Override Dialog */}
      <OverrideDialog
        open={overrideDialog.open}
        onClose={handleOverrideCancel}
        onConfirm={handleOverrideConfirm}
        slot={overrideDialog.slot || {
          time: '',
          pacingStatus: 'available',
          available: true,
          tablesAvailable: 0,
          alternativeTimes: []
        }}
        loading={loading}
      />
    </>
  );
};