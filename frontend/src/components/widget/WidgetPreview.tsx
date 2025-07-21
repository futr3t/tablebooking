import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { WidgetConfig } from '../../types';

interface WidgetPreviewProps {
  config: WidgetConfig;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ config }) => {
  const { theme, settings } = config;

  // Mock data for preview
  const mockTimeSlots = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM'];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        This is how your widget will appear on your website:
      </Typography>

      <Box
        sx={{
          maxWidth: 400,
          mx: 'auto',
          p: 2,
          border: '2px dashed #ddd',
          borderRadius: 2,
          backgroundColor: '#f9f9f9',
        }}
      >
        {/* Widget Preview */}
        <Card
          sx={{
            fontFamily: theme.fontFamily,
            borderRadius: theme.borderRadius,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent>
            {/* Header */}
            <Box
              sx={{
                backgroundColor: theme.primaryColor,
                color: 'white',
                p: 2,
                borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
                mx: -2,
                mt: -2,
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: theme.fontFamily,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Reserve a Table
              </Typography>
            </Box>

            {/* Form Fields */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Your Name"
                  placeholder="Enter your name"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: theme.borderRadius,
                      fontFamily: theme.fontFamily,
                    },
                  }}
                />
              </Grid>

              {settings.requireEmail && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email Address"
                    placeholder="your@email.com"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: theme.borderRadius,
                        fontFamily: theme.fontFamily,
                      },
                    }}
                  />
                </Grid>
              )}

              {settings.requirePhone && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Phone Number"
                    placeholder="(555) 123-4567"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: theme.borderRadius,
                        fontFamily: theme.fontFamily,
                      },
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={6}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: theme.fontFamily,
                    fontWeight: 500,
                    mb: 1,
                    color: 'text.primary',
                  }}
                >
                  Date
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  placeholder="dd/mm/yyyy"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: theme.borderRadius,
                      fontFamily: theme.fontFamily,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: theme.fontFamily,
                    fontWeight: 500,
                    mb: 1,
                    color: 'text.primary',
                  }}
                >
                  Party Size
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    defaultValue={2}
                    displayEmpty
                    sx={{
                      borderRadius: theme.borderRadius,
                      fontFamily: theme.fontFamily,
                    }}
                  >
                    {Array.from({ length: settings.maxPartySize }, (_, i) => i + 1).map(
                      (size) => (
                        <MenuItem key={size} value={size}>
                          {size} {size === 1 ? 'Guest' : 'Guests'}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {settings.showAvailableSlots && (
                <Grid item xs={12}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: theme.fontFamily,
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <AccessTime fontSize="small" />
                    Available Times
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {mockTimeSlots.map((time) => (
                      <Button
                        key={time}
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: theme.borderRadius,
                          fontFamily: theme.fontFamily,
                          borderColor: theme.primaryColor,
                          color: theme.primaryColor,
                          '&:hover': {
                            backgroundColor: theme.primaryColor,
                            color: 'white',
                          },
                          minWidth: 'auto',
                          px: 1.5,
                        }}
                      >
                        {time}
                      </Button>
                    ))}
                  </Box>
                </Grid>
              )}

              {settings.showSpecialRequests && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Special Requests"
                    placeholder="Any dietary restrictions or special occasions?"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: theme.borderRadius,
                        fontFamily: theme.fontFamily,
                      },
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: theme.primaryColor,
                    borderRadius: theme.borderRadius,
                    fontFamily: theme.fontFamily,
                    fontWeight: 600,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: theme.primaryColor,
                      filter: 'brightness(0.9)',
                    },
                  }}
                >
                  Book Table
                </Button>
              </Grid>
            </Grid>

            {/* Footer */}
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: `1px solid ${theme.secondaryColor}`,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: theme.fontFamily,
                  color: 'text.secondary',
                }}
              >
                Powered by TableBooking
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Widget Status Indicator */}
        <Box mt={2} textAlign="center">
          {config.isEnabled ? (
            <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
              Widget is enabled and ready to use
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
              Widget is disabled - enable it to start accepting bookings
            </Alert>
          )}
        </Box>
      </Box>

      {/* Theme Information */}
      <Box mt={3}>
        <Typography variant="subtitle2" gutterBottom>
          Current Theme Settings:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: theme.primaryColor,
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">Primary</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: theme.secondaryColor,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">Secondary</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              Font: {theme.fontFamily.split(',')[0]}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default WidgetPreview;
