import React, { useState, useEffect } from 'react';
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
  FormControlLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Restaurant as RestaurantIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface RestaurantSettings {
  maxCovers?: number;
  turnTimeMinutes: number;
  staggerMinutes: number;
  defaultSlotDuration: number;
  openingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    }
  };
  bookingSettings: {
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    maxPartySize?: number;
    slotDuration: number;
    bufferTime: number;
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
    maxCovers: undefined,
    turnTimeMinutes: 120,
    staggerMinutes: 15,
    defaultSlotDuration: 30,
    openingHours: {},
    bookingSettings: {
      maxAdvanceBookingDays: 90,
      minAdvanceBookingHours: 2,
      maxPartySize: undefined,
      slotDuration: 30,
      bufferTime: 15,
      enableWaitlist: true,
      requirePhone: true,
      requireEmail: false,
      autoConfirm: false,
      sendConfirmationEmail: true,
      sendConfirmationSMS: false,
      sendReminderEmail: true,
      sendReminderSMS: false,
      reminderHours: 24
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // For now, we'll use default settings
      // In a real implementation, this would fetch from the backend
      const defaultOpeningHours: any = {};
      DAYS_OF_WEEK.forEach(day => {
        defaultOpeningHours[day.key] = {
          isOpen: day.key !== 'monday', // Closed on Monday by default
          openTime: '11:00',
          closeTime: day.key === 'friday' || day.key === 'saturday' ? '23:00' : '22:00'
        };
      });
      
      setSettings(prev => ({
        ...prev,
        openingHours: defaultOpeningHours
      }));
    } catch (err) {
      setError('Failed to load restaurant settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any, nested?: string) => {
    setSettings(prev => {
      if (nested) {
        const nestedObj = prev[nested as keyof RestaurantSettings] as any;
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
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

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validation
      if (settings.turnTimeMinutes < 30) {
        throw new Error('Turn time must be at least 30 minutes');
      }
      if (settings.staggerMinutes < 5) {
        throw new Error('Stagger time must be at least 5 minutes');
      }
      if (settings.defaultSlotDuration < 15) {
        throw new Error('Slot duration must be at least 15 minutes');
      }

      // Here you would make an API call to save the settings
      // await restaurantService.updateSettings(user?.restaurantId, settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Restaurant Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RestaurantIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">
                    {settings.maxCovers || 'Unlimited'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Max Covers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">{avgTurnTime}h</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg Turn Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 2, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6">{settings.staggerMinutes}min</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Stagger Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">{openDays}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Days Open
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Capacity & Timing Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Capacity & Timing
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Maximum Covers"
                    type="number"
                    value={settings.maxCovers || ''}
                    onChange={(e) => handleSettingChange('maxCovers', 
                      e.target.value ? parseInt(e.target.value) : undefined
                    )}
                    helperText="Leave empty for unlimited capacity"
                    inputProps={{ min: 1, max: 1000 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Turn Time (minutes)"
                    type="number"
                    value={settings.turnTimeMinutes}
                    onChange={(e) => handleSettingChange('turnTimeMinutes', parseInt(e.target.value))}
                    helperText="How long each table booking lasts"
                    inputProps={{ min: 30, max: 480 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stagger Time (minutes)"
                    type="number"
                    value={settings.staggerMinutes}
                    onChange={(e) => handleSettingChange('staggerMinutes', parseInt(e.target.value))}
                    helperText="Minimum time between bookings"
                    inputProps={{ min: 5, max: 60 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Default Slot Duration (minutes)"
                    type="number"
                    value={settings.defaultSlotDuration}
                    onChange={(e) => handleSettingChange('defaultSlotDuration', parseInt(e.target.value))}
                    helperText="Time slot intervals for bookings"
                    inputProps={{ min: 15, max: 120 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Booking Rules
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Advance Days"
                    type="number"
                    value={settings.bookingSettings.maxAdvanceBookingDays}
                    onChange={(e) => handleSettingChange('maxAdvanceBookingDays', 
                      parseInt(e.target.value), 'bookingSettings'
                    )}
                    helperText="How far ahead bookings are allowed"
                    inputProps={{ min: 1, max: 365 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Min Advance Hours"
                    type="number"
                    value={settings.bookingSettings.minAdvanceBookingHours}
                    onChange={(e) => handleSettingChange('minAdvanceBookingHours', 
                      parseInt(e.target.value), 'bookingSettings'
                    )}
                    helperText="Minimum notice required"
                    inputProps={{ min: 0, max: 72 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Max Party Size"
                    type="number"
                    value={settings.bookingSettings.maxPartySize || ''}
                    onChange={(e) => handleSettingChange('maxPartySize', 
                      e.target.value ? parseInt(e.target.value) : undefined, 'bookingSettings'
                    )}
                    helperText="Leave empty for no limit"
                    inputProps={{ min: 1, max: 50 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.enableWaitlist}
                        onChange={(e) => handleSettingChange('enableWaitlist', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Enable Waitlist"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.autoConfirm}
                        onChange={(e) => handleSettingChange('autoConfirm', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Auto-Confirm Bookings"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Opening Hours */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Opening Hours
              </Typography>
              <Grid container spacing={2}>
                {DAYS_OF_WEEK.map(day => (
                  <Grid item xs={12} sm={6} md={4} key={day.key}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">{day.label}</Typography>
                        <Switch
                          checked={settings.openingHours[day.key]?.isOpen || false}
                          onChange={(e) => handleOpeningHoursChange(day.key, 'isOpen', e.target.checked)}
                        />
                      </Box>
                      {settings.openingHours[day.key]?.isOpen && (
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Open"
                              type="time"
                              size="small"
                              value={settings.openingHours[day.key]?.openTime || ''}
                              onChange={(e) => handleOpeningHoursChange(day.key, 'openTime', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Close"
                              type="time"
                              size="small"
                              value={settings.openingHours[day.key]?.closeTime || ''}
                              onChange={(e) => handleOpeningHoursChange(day.key, 'closeTime', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                        </Grid>
                      )}
                      {!settings.openingHours[day.key]?.isOpen && (
                        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                          Closed
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Communications
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Required Information
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.requirePhone}
                        onChange={(e) => handleSettingChange('requirePhone', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Require Phone Number"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.requireEmail}
                        onChange={(e) => handleSettingChange('requireEmail', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Require Email Address"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Automatic Notifications
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.sendConfirmationEmail}
                        onChange={(e) => handleSettingChange('sendConfirmationEmail', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Confirmation Emails"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingSettings.sendReminderEmail}
                        onChange={(e) => handleSettingChange('sendReminderEmail', 
                          e.target.checked, 'bookingSettings'
                        )}
                      />
                    }
                    label="Reminder Emails"
                  />
                  <TextField
                    fullWidth
                    label="Reminder Hours Before"
                    type="number"
                    size="small"
                    value={settings.bookingSettings.reminderHours}
                    onChange={(e) => handleSettingChange('reminderHours', 
                      parseInt(e.target.value), 'bookingSettings'
                    )}
                    inputProps={{ min: 1, max: 72 }}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RestaurantSettingsPanel;