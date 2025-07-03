import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Alert,
  Divider,
  Grid,
  Paper,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Restaurant as RestaurantIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { timeSlotRuleService } from '../../services/api';
import { TimeSlotRule, CreateTimeSlotRuleData, UpdateTimeSlotRuleData } from '../../types';

interface TimeSlotManagerProps {
  restaurantId: string;
  onUpdate?: () => void;
}

interface TimeSlotForm {
  name: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxConcurrentBookings?: number;
  turnTimeMinutes?: number;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DEFAULT_FORM: TimeSlotForm = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: 30,
  turnTimeMinutes: 15,
  isActive: true,
};

export default function TimeSlotManager({ restaurantId, onUpdate }: TimeSlotManagerProps) {
  const [timeSlotRules, setTimeSlotRules] = useState<TimeSlotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeSlotRule | null>(null);
  const [form, setForm] = useState<TimeSlotForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Load time slot rules
  const loadTimeSlotRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const rules = await timeSlotRuleService.getTimeSlotRules(restaurantId);
      setTimeSlotRules(rules);
    } catch (err: any) {
      console.error('Failed to load time slot rules:', err);
      setError(err.response?.data?.error || 'Failed to load time slot rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadTimeSlotRules();
    }
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form handlers
  const handleOpenDialog = (rule?: TimeSlotRule) => {
    if (rule) {
      setEditingRule(rule);
      setForm({
        name: rule.name,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotDurationMinutes: rule.slotDurationMinutes,
        maxConcurrentBookings: rule.maxConcurrentBookings,
        turnTimeMinutes: rule.turnTimeMinutes || 15,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setForm(DEFAULT_FORM);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setForm(DEFAULT_FORM);
    setError(null);
  };

  const handleFormChange = (field: keyof TimeSlotForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.startTime) return 'Start time is required';
    if (!form.endTime) return 'End time is required';
    
    const startMinutes = timeToMinutes(form.startTime);
    const endMinutes = timeToMinutes(form.endTime);
    
    if (startMinutes >= endMinutes) {
      return 'Start time must be before end time';
    }
    
    if (form.slotDurationMinutes < 15) {
      return 'Slot duration must be at least 15 minutes';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateTimeSlotRuleData | UpdateTimeSlotRuleData = {
        name: form.name.trim(),
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        slotDurationMinutes: form.slotDurationMinutes,
        maxConcurrentBookings: form.maxConcurrentBookings,
        turnTimeMinutes: form.turnTimeMinutes,
        isActive: form.isActive,
      };

      if (editingRule) {
        await timeSlotRuleService.updateTimeSlotRule(editingRule.id, data);
      } else {
        await timeSlotRuleService.createTimeSlotRule(restaurantId, data as CreateTimeSlotRuleData);
      }

      await loadTimeSlotRules();
      handleCloseDialog();
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to save time slot rule:', err);
      setError(err.response?.data?.error || 'Failed to save time slot rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rule: TimeSlotRule) => {
    if (!window.confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      await timeSlotRuleService.deleteTimeSlotRule(rule.id);
      await loadTimeSlotRules();
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to delete time slot rule:', err);
      setError(err.response?.data?.error || 'Failed to delete time slot rule');
    }
  };

  // Helper functions
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    return `${startTime} - ${endTime}`;
  };

  const getDayLabel = (dayOfWeek?: number): string => {
    if (dayOfWeek === undefined || dayOfWeek === null) return 'All Days';
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Unknown';
  };

  const groupRulesByDay = () => {
    const grouped: { [key: string]: TimeSlotRule[] } = {};
    
    timeSlotRules.forEach(rule => {
      const dayKey = rule.dayOfWeek?.toString() || 'all';
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(rule);
    });

    // Sort rules within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });

    return grouped;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading time slot rules...</Typography>
      </Box>
    );
  }

  const groupedRules = groupRulesByDay();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6">
            Opening Hours & Service Periods
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Service Period
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Info Card */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <RestaurantIcon color="primary" />
            <Typography variant="subtitle1" color="primary.main">
              Multiple Service Periods
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Configure multiple opening hours per day (e.g., lunch 12-3pm, dinner 6-10pm). 
            Each service period can have different slot durations and booking limits.
          </Typography>
        </CardContent>
      </Card>

      {/* Time Slot Rules Display */}
      {Object.keys(groupedRules).length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <TimeIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Service Periods Configured
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Add service periods to enable multiple opening hours per day
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add First Service Period
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {Object.entries(groupedRules).map(([dayKey, rules]) => (
            <Grid item xs={12} md={6} key={dayKey}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {getDayLabel(dayKey === 'all' ? undefined : parseInt(dayKey))}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    {rules.map((rule) => (
                      <Paper 
                        key={rule.id} 
                        variant="outlined" 
                        sx={{ p: 2, bgcolor: rule.isActive ? 'background.paper' : 'grey.50' }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {rule.name}
                              </Typography>
                              {!rule.isActive && (
                                <Chip label="Inactive" size="small" color="warning" />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                              {formatTimeRange(rule.startTime, rule.endTime)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {rule.slotDurationMinutes}min slots
                              {rule.maxConcurrentBookings && ` • Max ${rule.maxConcurrentBookings} concurrent`}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(rule)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(rule)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Service Period' : 'Add Service Period'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            {/* Name */}
            <TextField
              fullWidth
              label="Service Period Name"
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., Lunch Service, Dinner Service"
              required
            />

            {/* Day of Week */}
            <FormControl fullWidth>
              <InputLabel>Day of Week</InputLabel>
              <Select
                value={form.dayOfWeek ?? ''}
                onChange={(e) => handleFormChange('dayOfWeek', e.target.value === '' ? undefined : Number(e.target.value))}
                label="Day of Week"
              >
                <MenuItem value="">All Days</MenuItem>
                {DAYS_OF_WEEK.map((day) => (
                  <MenuItem key={day.value} value={day.value}>
                    {day.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Time Range */}
            <Box display="flex" gap={2}>
              <TextField
                label="Start Time"
                type="time"
                value={form.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
              <TextField
                label="End Time"
                type="time"
                value={form.endTime}
                onChange={(e) => handleFormChange('endTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
            </Box>

            {/* Slot Duration */}
            <TextField
              label="Slot Duration (minutes)"
              type="number"
              value={form.slotDurationMinutes}
              onChange={(e) => handleFormChange('slotDurationMinutes', Number(e.target.value))}
              inputProps={{ min: 15, max: 120, step: 15 }}
              helperText="Time between each booking slot (15-120 minutes)"
              fullWidth
            />

            {/* Advanced Settings */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Advanced Settings
              </Typography>
              
              <Box display="flex" gap={2} mb={2}>
                <TextField
                  label="Turn Time (minutes)"
                  type="number"
                  value={form.turnTimeMinutes || ''}
                  onChange={(e) => handleFormChange('turnTimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 15, max: 240, step: 15 }}
                  helperText="Time allocated per booking including cleanup"
                  fullWidth
                />
                <TextField
                  label="Max Concurrent Bookings"
                  type="number"
                  value={form.maxConcurrentBookings || ''}
                  onChange={(e) => handleFormChange('maxConcurrentBookings', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 1, max: 50 }}
                  helperText="Limit concurrent bookings at same time"
                  fullWidth
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (editingRule ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}