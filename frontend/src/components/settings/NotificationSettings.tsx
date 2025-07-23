import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  TextField,
  Button,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  TestTube as TestIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface NotificationSettings {
  email: {
    confirmation: boolean;
    reminder: boolean;
    cancellation: boolean;
    waitlist: boolean;
  };
  sms: {
    confirmation: boolean;
    reminder: boolean;
    cancellation: boolean;
    waitlist: boolean;
  };
  reminderHours: number;
  configured: {
    sendgrid: boolean;
    twilio: boolean;
  };
}

interface NotificationSettingsProps {
  restaurantId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ restaurantId }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testDialog, setTestDialog] = useState<{ open: boolean; type: 'email' | 'sms' | null }>({
    open: false,
    type: null
  });
  const [testContact, setTestContact] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [restaurantId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/notifications/config/${restaurantId}`);
      setSettings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      setMessage({ type: 'error', text: 'Failed to load notification settings' });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setSaving(true);
      await api.put(`/notifications/config/${restaurantId}`, newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      setMessage({ type: 'success', text: 'Notification settings updated successfully' });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setMessage({ type: 'error', text: 'Failed to update notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!testDialog.type || !testContact) return;

    try {
      setTestLoading(true);
      const endpoint = testDialog.type === 'email' ? 'test-email' : 'test-sms';
      const payload = testDialog.type === 'email'
        ? { email: testContact, restaurantName: 'Test Restaurant' }
        : { phone: testContact, restaurantName: 'Test Restaurant' };

      await api.post(`/notifications/${endpoint}`, payload);
      setMessage({
        type: 'success',
        text: `Test ${testDialog.type} sent to ${testContact}`
      });
      setTestDialog({ open: false, type: null });
      setTestContact('');
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || `Failed to send test ${testDialog.type}`
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleEmailSettingChange = (setting: keyof NotificationSettings['email'], value: boolean) => {
    if (!settings) return;
    const newEmailSettings = { ...settings.email, [setting]: value };
    updateSettings({ email: newEmailSettings });
  };

  const handleSmsSettingChange = (setting: keyof NotificationSettings['sms'], value: boolean) => {
    if (!settings) return;
    const newSmsSettings = { ...settings.sms, [setting]: value };
    updateSettings({ sms: newSmsSettings });
  };

  const handleReminderHoursChange = (hours: number) => {
    updateSettings({ reminderHours: hours });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Alert severity="error">
        Failed to load notification settings. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Service Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Service Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <EmailIcon color={settings.configured.sendgrid ? 'success' : 'error'} />
                <Box>
                  <Typography variant="subtitle2">Email Service (SendGrid)</Typography>
                  <Chip
                    label={settings.configured.sendgrid ? 'Configured' : 'Not Configured'}
                    color={settings.configured.sendgrid ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <SmsIcon color={settings.configured.twilio ? 'success' : 'error'} />
                <Box>
                  <Typography variant="subtitle2">SMS Service (Twilio)</Typography>
                  <Chip
                    label={settings.configured.twilio ? 'Configured' : 'Not Configured'}
                    color={settings.configured.twilio ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon />
            Email Notifications
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email.confirmation}
                    onChange={(e) => handleEmailSettingChange('confirmation', e.target.checked)}
                    disabled={saving || !settings.configured.sendgrid}
                  />
                }
                label="Booking Confirmation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email.reminder}
                    onChange={(e) => handleEmailSettingChange('reminder', e.target.checked)}
                    disabled={saving || !settings.configured.sendgrid}
                  />
                }
                label="Booking Reminder"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email.cancellation}
                    onChange={(e) => handleEmailSettingChange('cancellation', e.target.checked)}
                    disabled={saving || !settings.configured.sendgrid}
                  />
                }
                label="Booking Cancellation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email.waitlist}
                    onChange={(e) => handleEmailSettingChange('waitlist', e.target.checked)}
                    disabled={saving || !settings.configured.sendgrid}
                  />
                }
                label="Waitlist Notifications"
              />
            </Grid>
          </Grid>

          <Box mt={2}>
            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={() => setTestDialog({ open: true, type: 'email' })}
              disabled={!settings.configured.sendgrid}
            >
              Test Email
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* SMS Notifications */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmsIcon />
            SMS Notifications
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sms.confirmation}
                    onChange={(e) => handleSmsSettingChange('confirmation', e.target.checked)}
                    disabled={saving || !settings.configured.twilio}
                  />
                }
                label="Booking Confirmation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sms.reminder}
                    onChange={(e) => handleSmsSettingChange('reminder', e.target.checked)}
                    disabled={saving || !settings.configured.twilio}
                  />
                }
                label="Booking Reminder"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sms.cancellation}
                    onChange={(e) => handleSmsSettingChange('cancellation', e.target.checked)}
                    disabled={saving || !settings.configured.twilio}
                  />
                }
                label="Booking Cancellation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sms.waitlist}
                    onChange={(e) => handleSmsSettingChange('waitlist', e.target.checked)}
                    disabled={saving || !settings.configured.twilio}
                  />
                }
                label="Waitlist Notifications"
              />
            </Grid>
          </Grid>

          <Box mt={2}>
            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={() => setTestDialog({ open: true, type: 'sms' })}
              disabled={!settings.configured.twilio}
            >
              Test SMS
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Reminder Settings */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            Reminder Settings
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Hours Before Booking"
              type="number"
              value={settings.reminderHours}
              onChange={(e) => handleReminderHoursChange(parseInt(e.target.value) || 24)}
              inputProps={{ min: 1, max: 168 }}
              sx={{ width: 200 }}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              Send reminders {settings.reminderHours} hours before the booking
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <Dialog open={testDialog.open} onClose={() => setTestDialog({ open: false, type: null })}>
        <DialogTitle>
          Test {testDialog.type === 'email' ? 'Email' : 'SMS'} Notification
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={testDialog.type === 'email' ? 'Email Address' : 'Phone Number'}
            type={testDialog.type === 'email' ? 'email' : 'tel'}
            fullWidth
            variant="outlined"
            value={testContact}
            onChange={(e) => setTestContact(e.target.value)}
            placeholder={testDialog.type === 'email' ? 'test@example.com' : '+1234567890'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog({ open: false, type: null })}>
            Cancel
          </Button>
          <Button
            onClick={sendTestNotification}
            disabled={!testContact || testLoading}
            variant="contained"
          >
            {testLoading ? <CircularProgress size={20} /> : 'Send Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {saving && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="rgba(0,0,0,0.1)"
          zIndex={9999}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};
