import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  GroupWork as ConcurrentIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { restaurantService } from '../../services/api';
import { setGlobalDateFormat } from '../../utils/dateHelpers';

interface ServicePeriod {
  name: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
}

interface RestaurantSettings {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  description?: string;
  maxCovers?: number;
  timeZone?: string;
  dateFormat?: 'us' | 'uk';  // NEW: Date format preference
  turnTimeMinutes: number;
  defaultSlotDuration: number;
  openingHours: {
    [key: string]: {
      isOpen: boolean;
      periods?: ServicePeriod[];
      // Backward compatibility
      openTime?: string;
      closeTime?: string;
    }
  };
  bookingSettings: {
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    maxPartySize: number;
    slotDuration: number;
    maxConcurrentTables?: number; // NEW: Max tables starting at same time
    maxConcurrentCovers?: number; // NEW: Max people starting at same time  
    enableWaitlist: boolean;
    requirePhone: boolean;
    requireEmail: boolean;
    autoConfirm: boolean;
    sendConfirmationEmail: boolean;
    sendConfirmationSMS: boolean;
    sendReminderEmail: boolean;
    sendReminderSMS: boolean;
    reminderHours: number;
  };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const RestaurantSettingsPanel: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RestaurantSettings>({
    dateFormat: 'uk', // Default to UK format
    turnTimeMinutes: 120,
    defaultSlotDuration: 30,
    openingHours: {},
    bookingSettings: {
      maxAdvanceBookingDays: 90,
      minAdvanceBookingHours: 2,
      maxPartySize: 12,
      slotDuration: 30,
      maxConcurrentTables: undefined,
      maxConcurrentCovers: undefined,
      enableWaitlist: true,
      requirePhone: false,
      requireEmail: false,
      autoConfirm: true,
      sendConfirmationEmail: false,
      sendConfirmationSMS: false,
      sendReminderEmail: false,
      sendReminderSMS: false,
      reminderHours: 2
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user?.restaurantId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const restaurantSettings = await restaurantService.getSettings(user.restaurantId);
      console.log('Loaded restaurant settings:', restaurantSettings);
      
      // Initialize and migrate opening hours 
      let processedOpeningHours: any = {};
      if (!restaurantSettings.openingHours || Object.keys(restaurantSettings.openingHours).length === 0) {
        // No opening hours set - create defaults with new format
        DAYS_OF_WEEK.forEach(day => {
          processedOpeningHours[day.key] = {
            isOpen: day.key !== 'monday', // Closed on Monday by default
            periods: day.key !== 'monday' ? [{
              name: 'Service',
              startTime: '17:00',
              endTime: '21:00'
            }] : []
          };
        });
      } else {
        // Migrate existing opening hours to new format
        processedOpeningHours = migrateOpeningHours(restaurantSettings.openingHours);
      }
      
      setSettings(prevSettings => ({
        ...prevSettings,
        ...restaurantSettings,
        openingHours: processedOpeningHours,
        bookingSettings: {
          ...prevSettings.bookingSettings,
          ...restaurantSettings.bookingSettings
        }
      }));
      
      // Set global date format preference
      if (restaurantSettings.dateFormat) {
        setGlobalDateFormat(restaurantSettings.dateFormat);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load restaurant settings');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    if (user?.restaurantId) {
      loadSettings();
    }
  }, [user?.restaurantId, loadSettings]);

  const handleSettingChange = (field: string, value: any, nested?: string) => {
    // Sanitize numeric values to ensure proper types
    let sanitizedValue = value;
    
    // Handle NaN from parseInt
    if (typeof value === 'number' && isNaN(value)) {
      sanitizedValue = nested ? null : undefined;
    }
    
    // Update global date format if dateFormat is being changed
    if (field === 'dateFormat' && !nested) {
      setGlobalDateFormat(sanitizedValue);
    }
    
    setSettings(prev => {
      if (nested) {
        const nestedObj = prev[nested as keyof RestaurantSettings] as any;
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: sanitizedValue
          }
        };
      }
      return {
        ...prev,
        [field]: sanitizedValue
      };
    });
  };

  const handleOpeningHoursChange = (day: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
  };

  const addServicePeriod = (day: string) => {
    const newPeriod: ServicePeriod = {
      name: '',
      startTime: '12:00',
      endTime: '15:00'
    };

    setSettings(prev => {
      const daySchedule = prev.openingHours[day] || { isOpen: false };
      const periods = daySchedule.periods || [];
      
      return {
        ...prev,
        openingHours: {
          ...prev.openingHours,
          [day]: {
            ...daySchedule,
            isOpen: true,
            periods: [...periods, newPeriod]
          }
        }
      };
    });
  };

  const removeServicePeriod = (day: string, periodIndex: number) => {
    setSettings(prev => {
      const daySchedule = prev.openingHours[day];
      if (!daySchedule?.periods) return prev;

      const newPeriods = daySchedule.periods.filter((_, index) => index !== periodIndex);
      
      return {
        ...prev,
        openingHours: {
          ...prev.openingHours,
          [day]: {
            ...daySchedule,
            periods: newPeriods,
            isOpen: newPeriods.length > 0
          }
        }
      };
    });
  };

  const updateServicePeriod = (day: string, periodIndex: number, field: keyof ServicePeriod, value: any) => {
    setSettings(prev => {
      const daySchedule = prev.openingHours[day];
      if (!daySchedule?.periods) return prev;

      const newPeriods = [...daySchedule.periods];
      newPeriods[periodIndex] = {
        ...newPeriods[periodIndex],
        [field]: value
      };

      return {
        ...prev,
        openingHours: {
          ...prev.openingHours,
          [day]: {
            ...daySchedule,
            periods: newPeriods
          }
        }
      };
    });
  };

  // Auto-migrate old format to new format
  const migrateOpeningHours = (openingHours: any) => {
    const migrated: any = {};
    
    DAYS_OF_WEEK.forEach(day => {
      const daySchedule = openingHours[day.key];
      if (daySchedule) {
        if (daySchedule.openTime && daySchedule.closeTime && !daySchedule.periods) {
          // Old format - convert to new format
          migrated[day.key] = {
            isOpen: daySchedule.isOpen,
            periods: daySchedule.isOpen ? [{
              name: 'Service',
              startTime: daySchedule.openTime,
              endTime: daySchedule.closeTime
            }] : []
          };
        } else {
          // Already in new format or is closed
          migrated[day.key] = daySchedule;
        }
      } else {
        migrated[day.key] = { isOpen: false, periods: [] };
      }
    });
    
    return migrated;
  };

  const handleSave = async () => {
    if (!user?.restaurantId) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Client-side validation
      if (settings.turnTimeMinutes < 30) {
        throw new Error('Turn time must be at least 30 minutes');
      }
      if (settings.defaultSlotDuration < 15) {
        throw new Error('Slot duration must be at least 15 minutes');
      }
      if (settings.bookingSettings.maxPartySize < 1) {
        throw new Error('Max party size must be at least 1');
      }
      if (settings.bookingSettings.maxConcurrentTables !== undefined && settings.bookingSettings.maxConcurrentTables < 0) {
        throw new Error('Max concurrent tables must be non-negative');
      }
      if (settings.bookingSettings.maxConcurrentCovers !== undefined && settings.bookingSettings.maxConcurrentCovers < 0) {
        throw new Error('Max concurrent covers must be non-negative');
      }

      // Extract only the fields that should be updated
      const updatePayload = {
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        cuisine: settings.cuisine,
        description: settings.description,
        maxCovers: settings.maxCovers,
        timeZone: settings.timeZone,
        dateFormat: settings.dateFormat,
        turnTimeMinutes: settings.turnTimeMinutes,
        defaultSlotDuration: settings.defaultSlotDuration,
        openingHours: settings.openingHours,
        bookingSettings: settings.bookingSettings
      };
      
      console.log('Saving settings:', updatePayload);
      
      await restaurantService.updateSettings(user.restaurantId, updatePayload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      console.error('Full error object:', {
        response: err.response,
        data: err.response?.data,
        message: err.message,
        statusCode: err.response?.status
      });
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to save settings';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getOperationalSummary = () => {
    const openDays = Object.values(settings.openingHours).filter(day => day.isOpen).length;
    const avgTurnTime = settings.turnTimeMinutes / 60;
    return { openDays, avgTurnTime };
  };

  const { openDays, avgTurnTime } = getOperationalSummary();

  if (!user?.restaurantId) {
    return (
      <Alert severity="error">
        Restaurant access required
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading restaurant settings...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 4,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5
          }}>
            Restaurant Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure your restaurant's operational settings and booking preferences
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              '&:hover': {
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Operational Summary */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            Operational Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Open Days:</Typography>
                <Chip label={`${openDays}/7 days`} size="small" color="primary" />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Average Turn Time:</Typography>
                <Chip label={`${avgTurnTime} hours`} size="small" color="secondary" />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Time Slots:</Typography>
                <Chip label={`${settings.bookingSettings.slotDuration} min intervals`} size="small" color="info" />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Capacity & Timing Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="primary" />
                Capacity & Timing
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Maximum Covers"
                    type="number"
                    value={settings.maxCovers || ''}
                    onChange={(e) => handleSettingChange('maxCovers', e.target.value ? parseInt(e.target.value) : null)}
                    helperText="Leave empty for unlimited capacity"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Turn Time (minutes)"
                    type="number"
                    value={settings.turnTimeMinutes}
                    onChange={(e) => handleSettingChange('turnTimeMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
                    helperText="How long each booking lasts (includes cleanup)"
                    inputProps={{ min: 30, max: 480 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Time Slot Duration (minutes)"
                    type="number"
                    value={settings.defaultSlotDuration}
                    onChange={(e) => handleSettingChange('defaultSlotDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                    helperText="How often booking slots are offered"
                    inputProps={{ min: 15, max: 120 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      value={settings.dateFormat || 'uk'}
                      onChange={(e) => handleSettingChange('dateFormat', e.target.value as 'us' | 'uk')}
                      label="Date Format"
                    >
                      <MenuItem value="uk">UK Format (dd/MM/yyyy)</MenuItem>
                      <MenuItem value="us">US Format (MM/dd/yyyy)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* NEW: Concurrent Booking Limits */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ConcurrentIcon color="primary" />
                Concurrent Booking Limits
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control how many bookings can start at the same time (staff can override)
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Concurrent Tables"
                    type="number"
                    value={settings.bookingSettings.maxConcurrentTables || ''}
                    onChange={(e) => handleSettingChange('maxConcurrentTables', e.target.value ? parseInt(e.target.value) : null, 'bookingSettings')}
                    helperText="Max tables starting at same time"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Concurrent Covers"
                    type="number"
                    value={settings.bookingSettings.maxConcurrentCovers || ''}
                    onChange={(e) => handleSettingChange('maxConcurrentCovers', e.target.value ? parseInt(e.target.value) : null, 'bookingSettings')}
                    helperText="Max people starting at same time"
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>How it works:</strong> Guest bookings are limited, but staff can override these limits when making manual bookings.
                      Leave empty for no limits.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Rules */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" />
                Booking Rules
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Advance Booking Days"
                    type="number"
                    value={settings.bookingSettings.maxAdvanceBookingDays}
                    onChange={(e) => handleSettingChange('maxAdvanceBookingDays', e.target.value ? parseInt(e.target.value) : 90, 'bookingSettings')}
                    inputProps={{ min: 1, max: 365 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Min Advance Booking Hours"
                    type="number"
                    value={settings.bookingSettings.minAdvanceBookingHours}
                    onChange={(e) => handleSettingChange('minAdvanceBookingHours', e.target.value ? parseInt(e.target.value) : 2, 'bookingSettings')}
                    inputProps={{ min: 0, max: 168 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Party Size"
                    type="number"
                    value={settings.bookingSettings.maxPartySize}
                    onChange={(e) => handleSettingChange('maxPartySize', e.target.value ? parseInt(e.target.value) : 12, 'bookingSettings')}
                    inputProps={{ min: 1, max: 50 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reminder Hours"
                    type="number"
                    value={settings.bookingSettings.reminderHours}
                    onChange={(e) => handleSettingChange('reminderHours', e.target.value ? parseInt(e.target.value) : 2, 'bookingSettings')}
                    helperText="Hours before booking to send reminders"
                    inputProps={{ min: 0, max: 72 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.enableWaitlist}
                          onChange={(e) => handleSettingChange('enableWaitlist', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Enable Waitlist"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.autoConfirm}
                          onChange={(e) => handleSettingChange('autoConfirm', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Auto-Confirm Bookings"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Requirements */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="primary" />
                Customer Requirements & Communications
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Required Information</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.requirePhone}
                          onChange={(e) => handleSettingChange('requirePhone', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Require Phone Number"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.requireEmail}
                          onChange={(e) => handleSettingChange('requireEmail', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Require Email Address"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Email Notifications</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.sendConfirmationEmail}
                          onChange={(e) => handleSettingChange('sendConfirmationEmail', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Send Confirmation Emails"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.sendReminderEmail}
                          onChange={(e) => handleSettingChange('sendReminderEmail', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Send Reminder Emails"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>SMS Notifications</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.sendConfirmationSMS}
                          onChange={(e) => handleSettingChange('sendConfirmationSMS', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Send Confirmation SMS"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.bookingSettings.sendReminderSMS}
                          onChange={(e) => handleSettingChange('sendReminderSMS', e.target.checked, 'bookingSettings')}
                        />
                      }
                      label="Send Reminder SMS"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Opening Hours with Multiple Service Periods */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" />
                    Opening Hours & Service Periods
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure multiple service periods per day (e.g., lunch and dinner)
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={3}>
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedule = settings.openingHours[day.key] || { isOpen: false, periods: [] };
                  const periods = daySchedule.periods || [];
                  
                  return (
                    <Grid item xs={12} lg={6} key={day.key}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={daySchedule.isOpen}
                                  onChange={(e) => {
                                    const isOpen = e.target.checked;
                                    if (!isOpen) {
                                      // Close the day - clear all periods
                                      handleOpeningHoursChange(day.key, 'periods', []);
                                    }
                                    handleOpeningHoursChange(day.key, 'isOpen', isOpen);
                                  }}
                                />
                              }
                              label={<Typography variant="h6">{day.label}</Typography>}
                            />
                            
                            {daySchedule.isOpen && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => addServicePeriod(day.key)}
                                sx={{ minWidth: 'auto' }}
                              >
                                Add Period
                              </Button>
                            )}
                          </Box>
                          
                          {!daySchedule.isOpen && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              Closed
                            </Typography>
                          )}
                          
                          {daySchedule.isOpen && periods.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                No service periods configured
                              </Typography>
                              <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => addServicePeriod(day.key)}
                                size="small"
                              >
                                Add First Period
                              </Button>
                            </Box>
                          )}
                          
                          {periods.map((period, periodIndex) => (
                            <Box key={periodIndex} sx={{ 
                              border: '1px solid', 
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 2,
                              mb: 2,
                              '&:last-child': { mb: 0 }
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <TextField
                                  size="small"
                                  label="Period Name"
                                  value={period.name}
                                  onChange={(e) => updateServicePeriod(day.key, periodIndex, 'name', e.target.value)}
                                  placeholder="e.g., Lunch, Dinner, Brunch"
                                  sx={{ flex: 1, mr: 1 }}
                                />
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeServicePeriod(day.key, periodIndex)}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <TextField
                                  size="small"
                                  label="Start Time"
                                  type="time"
                                  value={period.startTime}
                                  onChange={(e) => updateServicePeriod(day.key, periodIndex, 'startTime', e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ flex: 1 }}
                                />
                                <TextField
                                  size="small"
                                  label="End Time"
                                  type="time"
                                  value={period.endTime}
                                  onChange={(e) => updateServicePeriod(day.key, periodIndex, 'endTime', e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ flex: 1 }}
                                />
                              </Box>
                              
                              <TextField
                                size="small"
                                label="Slot Duration (minutes)"
                                type="number"
                                value={period.slotDurationMinutes || ''}
                                onChange={(e) => updateServicePeriod(day.key, periodIndex, 'slotDurationMinutes', e.target.value ? parseInt(e.target.value) : 30)}
                                placeholder={`Default: ${settings.defaultSlotDuration} min`}
                                inputProps={{ min: 15, max: 120 }}
                                helperText="Leave empty to use restaurant default"
                                fullWidth
                              />
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>💡 Pro Tip:</strong> You can now configure multiple service periods per day! 
                  Add separate periods for lunch (12:00-15:00) and dinner (17:00-22:00), 
                  each with their own custom slot durations.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default RestaurantSettingsPanel;