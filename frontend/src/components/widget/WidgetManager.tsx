import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Button,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { Settings, Code, Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import { widgetService } from '../../services/api';
import { WidgetConfig } from '../../types';
import WidgetConfigForm from './WidgetConfigForm';
import InstallationCode from './InstallationCode';
import WidgetPreview from './WidgetPreview';

const WidgetManager: React.FC = () => {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInstallation, setShowInstallation] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadWidgetConfig();
  }, []);

  const loadWidgetConfig = async () => {
    try {
      setLoading(true);
      const widgetConfig = await widgetService.getConfig();
      setConfig(widgetConfig);
    } catch (err: any) {
      setError('Failed to load widget configuration');
      console.error('Error loading widget config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWidget = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      
      const newEnabledState = !config.isEnabled;
      await widgetService.toggleWidget(newEnabledState);
      
      setConfig({ ...config, isEnabled: newEnabledState });
      setSuccess(`Widget ${newEnabledState ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      setError('Failed to toggle widget status');
      console.error('Error toggling widget:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigUpdate = async (updatedConfig: Partial<WidgetConfig>) => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      
      const updated = await widgetService.updateConfig(updatedConfig);
      setConfig({ ...config, ...updated });
      setSuccess('Widget configuration updated successfully');
      setShowConfig(false);
    } catch (err: any) {
      setError('Failed to update widget configuration');
      console.error('Error updating widget config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!config) return;

    const confirmed = window.confirm(
      'Are you sure you want to regenerate the API key? You will need to update your website with the new key.'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');
      
      const result = await widgetService.regenerateApiKey();
      setConfig({ ...config, apiKey: result.apiKey });
      setSuccess('API key regenerated successfully. Please update your website.');
    } catch (err: any) {
      setError('Failed to regenerate API key');
      console.error('Error regenerating API key:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading widget configuration...</Typography>
      </Box>
    );
  }

  if (!config) {
    return (
      <Alert severity="error">
        Failed to load widget configuration. Please refresh the page and try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Booking Widget Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your embeddable booking widget that customers can use on your website.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Widget Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                {config.isEnabled ? (
                  <Visibility color="primary" sx={{ mr: 1 }} />
                ) : (
                  <VisibilityOff color="disabled" sx={{ mr: 1 }} />
                )}
                <Typography variant="h6">Widget Status</Typography>
              </Box>

              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="body2">
                  Widget is currently{' '}
                  <Chip
                    label={config.isEnabled ? 'Enabled' : 'Disabled'}
                    color={config.isEnabled ? 'success' : 'default'}
                    size="small"
                  />
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.isEnabled}
                      onChange={handleToggleWidget}
                      disabled={saving}
                    />
                  }
                  label={config.isEnabled ? 'Enabled' : 'Disabled'}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                {config.isEnabled
                  ? 'Your booking widget is live and accepting reservations.'
                  : 'Your booking widget is disabled. Enable it to start accepting online reservations.'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" gutterBottom>
                <strong>API Key:</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  p: 1,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  mb: 1,
                  border: '1px solid #4b5563',
                  fontSize: '0.875rem',
                  letterSpacing: '0.5px',
                }}
              >
                {config.apiKey}
              </Typography>
              
              <Button
                size="small"
                startIcon={<Refresh />}
                onClick={handleRegenerateApiKey}
                disabled={saving}
              >
                Regenerate Key
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setShowConfig(true)}
                  fullWidth
                >
                  Configure Widget
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Code />}
                  onClick={() => setShowInstallation(true)}
                  fullWidth
                >
                  Get Installation Code
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>Current Theme:</strong> {config.theme.primaryColor}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Max Party Size:</strong> {config.settings.maxPartySize} guests
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Advance Booking:</strong> {config.settings.advanceBookingDays} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Widget Preview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Widget Preview
              </Typography>
              <WidgetPreview config={config} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Configuration Dialog */}
      {showConfig && (
        <WidgetConfigForm
          config={config}
          open={showConfig}
          onClose={() => setShowConfig(false)}
          onSave={handleConfigUpdate}
          saving={saving}
        />
      )}

      {/* Installation Code Dialog */}
      {showInstallation && (
        <InstallationCode
          open={showInstallation}
          onClose={() => setShowInstallation(false)}
          config={config}
        />
      )}
    </Box>
  );
};

export default WidgetManager;