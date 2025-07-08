import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  Slider,
  Chip
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { tableService } from '../../services/api';
import { Table } from '../../types';

interface TableConfigurationFormProps {
  table?: Table | null;
  restaurantId: string;
  onSave: () => void;
  onCancel: () => void;
}

const TABLE_TYPES = [
  { value: 'standard', label: 'Standard', description: 'Regular dining table' },
  { value: 'booth', label: 'Booth', description: 'Booth seating with fixed benches' },
  { value: 'bar', label: 'Bar', description: 'High bar seating' },
  { value: 'high_top', label: 'High Top', description: 'Standing height table' },
  { value: 'patio', label: 'Patio', description: 'Outdoor seating' },
  { value: 'private', label: 'Private', description: 'Private dining room' },
  { value: 'banquette', label: 'Banquette', description: 'Built-in bench seating' },
  { value: 'communal', label: 'Communal', description: 'Shared large table' }
];


const TableConfigurationForm: React.FC<TableConfigurationFormProps> = ({
  table,
  restaurantId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    number: '',
    capacity: 4,
    minCapacity: 2,
    maxCapacity: 6,
    tableType: 'standard' as 'standard' | 'booth' | 'bar' | 'high_top' | 'patio' | 'private' | 'banquette' | 'communal',
    notes: '',
    locationNotes: '',
    isCombinable: true,
    priority: 0,
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (table) {
      setFormData({
        number: table.number,
        capacity: table.capacity,
        minCapacity: table.minCapacity,
        maxCapacity: table.maxCapacity,
        tableType: table.tableType,
        notes: table.notes || '',
        locationNotes: table.locationNotes || '',
        isCombinable: table.isCombinable,
        priority: table.priority,
        isActive: table.isActive
      });
    }
  }, [table]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-adjust min/max capacity when capacity changes
    if (field === 'capacity') {
      const capacity = parseInt(value);
      if (!isNaN(capacity)) {
        setFormData(prev => ({
          ...prev,
          capacity,
          minCapacity: Math.max(1, capacity - 2),
          maxCapacity: capacity + 2
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.number.trim()) {
        throw new Error('Table number is required');
      }
      if (formData.capacity < 1) {
        throw new Error('Capacity must be at least 1');
      }
      if (formData.minCapacity > formData.capacity) {
        throw new Error('Minimum capacity cannot exceed main capacity');
      }
      if (formData.maxCapacity < formData.capacity) {
        throw new Error('Maximum capacity cannot be less than main capacity');
      }

      const tableData = {
        ...formData,
        position: { x: 0, y: 0, width: 80, height: 80 } // Default position
      };

      console.log('Submitting table data:', tableData);
      console.log('Restaurant ID:', restaurantId);

      if (table) {
        console.log('Updating table:', table.id);
        await tableService.updateTable(table.id, tableData);
      } else {
        console.log('Creating new table');
        await tableService.createTable(restaurantId, tableData);
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving table:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save table';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedTableType = TABLE_TYPES.find(t => t.value === formData.tableType);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
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
            Table Number *
          </Typography>
          <TextField
            fullWidth
            value={formData.number}
            onChange={(e) => handleChange('number', e.target.value)}
            required
            helperText="Unique identifier for this table (e.g., T1, Table-A, 101)"
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
            Table Type *
          </Typography>
          <FormControl fullWidth required>
            <Select
              value={formData.tableType}
              onChange={(e) => handleChange('tableType', e.target.value)}
              sx={{
                '& .MuiInputLabel-root': {
                  display: 'none',
                }
              }}
            >
              {TABLE_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography>{type.label}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {selectedTableType && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="primary">
                  {selectedTableType.label} Table
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedTableType.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Capacity Settings */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Capacity Settings
          </Typography>
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
            Main Capacity *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.capacity}
            onChange={(e) => handleChange('capacity', e.target.value)}
            required
            inputProps={{ min: 1, max: 50 }}
            helperText="Primary seating capacity"
            sx={{
              '& .MuiInputLabel-root': {
                display: 'none',
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
            Minimum Capacity *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.minCapacity}
            onChange={(e) => handleChange('minCapacity', e.target.value)}
            required
            inputProps={{ min: 1, max: formData.capacity }}
            helperText="Smallest party size"
            sx={{
              '& .MuiInputLabel-root': {
                display: 'none',
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
            Maximum Capacity *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.maxCapacity}
            onChange={(e) => handleChange('maxCapacity', e.target.value)}
            required
            inputProps={{ min: formData.capacity, max: 50 }}
            helperText="Largest party size"
            sx={{
              '& .MuiInputLabel-root': {
                display: 'none',
              }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ px: 2 }}>
            <Typography gutterBottom>
              Capacity Range: {formData.minCapacity} - {formData.maxCapacity} people
            </Typography>
            <Slider
              value={[formData.minCapacity, formData.maxCapacity]}
              onChange={(_, newValue) => {
                const [min, max] = newValue as number[];
                setFormData(prev => ({
                  ...prev,
                  minCapacity: min,
                  maxCapacity: max
                }));
              }}
              valueLabelDisplay="auto"
              min={1}
              max={20}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' }
              ]}
            />
          </Box>
        </Grid>

        {/* Physical Properties */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Physical Properties
          </Typography>
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
            Priority
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            inputProps={{ min: 0, max: 10 }}
            helperText="Higher priority tables are preferred (0-10)"
            sx={{
              '& .MuiInputLabel-root': {
                display: 'none',
              }
            }}
          />
        </Grid>

        {/* Features */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Features & Accessibility
          </Typography>
        </Grid>


        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isCombinable}
                onChange={(e) => handleChange('isCombinable', e.target.checked)}
              />
            }
            label="Can be Combined with Other Tables"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
              />
            }
            label="Active (Available for Booking)"
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Additional Information
          </Typography>
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
            Table Notes
          </Typography>
          <TextField
            fullWidth
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            multiline
            rows={3}
            helperText="Internal notes about this table"
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
            Location Notes
          </Typography>
          <TextField
            fullWidth
            value={formData.locationNotes}
            onChange={(e) => handleChange('locationNotes', e.target.value)}
            multiline
            rows={3}
            helperText="Location description (e.g., 'Near window', 'Private corner')"
            sx={{
              '& .MuiInputLabel-root': {
                display: 'none',
              }
            }}
          />
        </Grid>

        {/* Summary */}
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Table Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`Table ${formData.number}`} color="primary" />
                <Chip label={selectedTableType?.label || formData.tableType} />
                <Chip label={`${formData.capacity} seats`} />
                <Chip label={`Range: ${formData.minCapacity}-${formData.maxCapacity}`} />
                {formData.isCombinable && <Chip label="Combinable" color="info" />}
                {!formData.isActive && <Chip label="Inactive" color="warning" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={<SaveIcon />}
            >
              {loading ? 'Saving...' : table ? 'Update Table' : 'Create Table'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TableConfigurationForm;