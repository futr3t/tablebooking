import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Slider,
  Divider,
} from '@mui/material';
// Color picker functionality built into TextField with type="color"
import { WidgetConfig } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`widget-tabpanel-${index}`}
      aria-labelledby={`widget-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface WidgetConfigFormProps {
  config: WidgetConfig;
  open: boolean;
  onClose: () => void;
  onSave: (config: Partial<WidgetConfig>) => void;
  saving: boolean;
}

const WidgetConfigForm: React.FC<WidgetConfigFormProps> = ({
  config,
  open,
  onClose,
  onSave,
  saving,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState(config);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleThemeChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      theme: {
        ...formData.theme,
        [field]: value,
      },
    });
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        [field]: value,
      },
    });
  };

  const handleSave = () => {
    const updateData = {
      theme: formData.theme,
      settings: formData.settings,
    };
    onSave(updateData);
  };

  const fontOptions = [
    'Roboto, sans-serif',
    'Georgia, serif',
    'Arial, sans-serif',
    'Times New Roman, serif',
    'Helvetica, sans-serif',
    'Verdana, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>Configure Booking Widget</DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Appearance" />
            <Tab label="Settings" />
            <Tab label="Messages" />
          </Tabs>
        </Box>

        {/* Appearance Tab */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Theme Customization
          </Typography>
          
          <Grid container spacing={3}>
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
                Primary Color
              </Typography>
              <TextField
                fullWidth
                type="color"
                value={formData.theme.primaryColor}
                onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                helperText="Main color for buttons and highlights"
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
                Secondary Color
              </Typography>
              <TextField
                fullWidth
                type="color"
                value={formData.theme.secondaryColor}
                onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                helperText="Background and secondary elements"
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
                Font Family
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.theme.fontFamily}
                  onChange={(e) => handleThemeChange('fontFamily', e.target.value)}
                  sx={{
                    '& .MuiInputLabel-root': {
                      display: 'none',
                    }
                  }}
                >
                  {fontOptions.map((font) => (
                    <MenuItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font.split(',')[0]}</span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                Border Radius
              </Typography>
              <TextField
                fullWidth
                value={formData.theme.borderRadius}
                onChange={(e) => handleThemeChange('borderRadius', e.target.value)}
                placeholder="4px"
                helperText="Rounded corners (e.g., 4px, 8px, 12px)"
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Preview Colors
          </Typography>
          
          <Box display="flex" gap={2} mb={2}>
            <Box
              sx={{
                width: 100,
                height: 50,
                backgroundColor: formData.theme.primaryColor,
                borderRadius: formData.theme.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontFamily: formData.theme.fontFamily,
                fontSize: '12px',
              }}
            >
              Primary
            </Box>
            <Box
              sx={{
                width: 100,
                height: 50,
                backgroundColor: formData.theme.secondaryColor,
                borderRadius: formData.theme.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: formData.theme.fontFamily,
                fontSize: '12px',
                border: '1px solid #ddd',
              }}
            >
              Secondary
            </Box>
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Booking Settings
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Max Party Size: {formData.settings.maxPartySize}</Typography>
              <Slider
                value={formData.settings.maxPartySize}
                onChange={(e, value) => handleSettingsChange('maxPartySize', value)}
                min={1}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Advance Booking Days: {formData.settings.advanceBookingDays}</Typography>
              <Slider
                value={formData.settings.advanceBookingDays}
                onChange={(e, value) => handleSettingsChange('advanceBookingDays', value)}
                min={1}
                max={365}
                step={1}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Required Fields
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.requirePhone}
                    onChange={(e) => handleSettingsChange('requirePhone', e.target.checked)}
                  />
                }
                label="Require Phone Number"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.requireEmail}
                    onChange={(e) => handleSettingsChange('requireEmail', e.target.checked)}
                  />
                }
                label="Require Email Address"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Display Options
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.showAvailableSlots}
                    onChange={(e) => handleSettingsChange('showAvailableSlots', e.target.checked)}
                  />
                }
                label="Show Available Time Slots"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.showSpecialRequests}
                    onChange={(e) => handleSettingsChange('showSpecialRequests', e.target.checked)}
                  />
                }
                label="Show Special Requests Field"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Messages Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Custom Messages
          </Typography>

          <Grid container spacing={3}>
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
                Confirmation Message
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.settings.confirmationMessage}
                onChange={(e) => handleSettingsChange('confirmationMessage', e.target.value)}
                helperText="Message shown to customers after successful booking"
                placeholder="Thank you for your reservation! We look forward to serving you."
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetConfigForm;