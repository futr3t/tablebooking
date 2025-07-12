import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  MenuItem,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import {
  Warning,
  AccessTime,
  People,
  TableRestaurant,
  CheckCircle
} from '@mui/icons-material';

interface OverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  slot: {
    time: string;
    pacingStatus: 'available' | 'moderate' | 'busy' | 'pacing_full' | 'physically_full';
    available: boolean;
    tablesAvailable?: number;
    alternativeTimes?: string[];
    overrideRisk?: 'low' | 'medium' | 'high';
    currentBookings?: number;
    utilizationPercent?: number;
    canOverride?: boolean;
    totalTablesBooked?: number;
  };
  loading?: boolean;
}

const OVERRIDE_REASONS = [
  'VIP customer request',
  'Regular customer accommodation',
  'Special occasion (birthday, anniversary)',
  'Manager approval',
  'Cancellation opened up space',
  'Customer specifically requested this time',
  'Wedding party or large group',
  'Other (please specify)'
];

const OverrideDialog: React.FC<OverrideDialogProps> = ({
  open,
  onClose,
  onConfirm,
  slot,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const getRiskLevel = (pacingStatus: string, overrideRisk?: string) => {
    // Use explicit override risk if available, otherwise infer from pacing status
    const riskLevel = overrideRisk || (pacingStatus === 'pacing_full' ? 'high' : pacingStatus === 'busy' ? 'medium' : 'low');
    
    switch (riskLevel) {
      case 'high': return { level: 'High', color: 'error' as const, icon: <Warning /> };
      case 'medium': return { level: 'Medium', color: 'warning' as const, icon: <AccessTime /> };
      default: return { level: 'Low', color: 'success' as const, icon: <CheckCircle /> };
    }
  };

  const risk = getRiskLevel(slot.pacingStatus, slot.overrideRisk);

  const handleConfirm = () => {
    const finalReason = reason === 'Other (please specify)' ? customReason : reason;
    if (finalReason.trim().length >= 5) {
      onConfirm(finalReason);
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    onClose();
  };

  const isReasonValid = () => {
    if (reason === 'Other (please specify)') {
      return customReason.trim().length >= 5;
    }
    return reason.trim().length >= 5;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          <Typography variant="h6">Override Pacing Limits</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2}>
          {/* Slot Information */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Time Slot Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <AccessTime fontSize="small" />
              <Typography variant="body2">
                <strong>{slot.time}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <People fontSize="small" />
              <Typography variant="body2">
                Status: <Chip 
                  label={slot.pacingStatus.toUpperCase()} 
                  size="small" 
                  color={risk.color}
                  icon={risk.icon}
                />
              </Typography>
            </Box>
            {slot.tablesAvailable !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TableRestaurant fontSize="small" />
                <Typography variant="body2">
                  Tables Available: {slot.tablesAvailable}
                </Typography>
              </Box>
            )}
            {slot.currentBookings !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People fontSize="small" />
                <Typography variant="body2">
                  Current Bookings: {slot.currentBookings}
                </Typography>
              </Box>
            )}
            {slot.utilizationPercent !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccessTime fontSize="small" />
                <Typography variant="body2">
                  Utilization: {slot.utilizationPercent}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Risk Level Alert */}
          <Alert 
            severity={risk.color} 
            icon={risk.icon}
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Override Risk Level: {risk.level}
              </Typography>
              <Typography variant="body2">
                {slot.pacingStatus === 'physically_full' && 
                  'This time slot has no available tables. Override is not possible.'
                }
                {slot.pacingStatus === 'pacing_full' && 
                  'This time slot is at pacing capacity but tables are available. Booking may impact service quality.'
                }
                {slot.pacingStatus === 'busy' && 
                  'This time slot is busy. Consider alternative times if possible.'
                }
                {slot.pacingStatus === 'moderate' && 
                  'This time slot has moderate activity. Override should be fine.'
                }
              </Typography>
            </Box>
          </Alert>

          {/* Alternative Times */}
          {slot.alternativeTimes && slot.alternativeTimes.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Alternative Times Available
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {slot.alternativeTimes.map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider />

          {/* Reason Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Reason for Override *
            </Typography>
            <TextField
              fullWidth
              select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText="Please select a reason for overriding the pacing limits"
              required
            >
              {OVERRIDE_REASONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Custom Reason Input */}
          {reason === 'Other (please specify)' && (
            <TextField
              fullWidth
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please provide a specific reason..."
              helperText="Minimum 5 characters required"
              required
              multiline
              rows={2}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          color="warning"
          disabled={loading || !isReasonValid() || slot.pacingStatus === 'physically_full'}
          startIcon={loading ? undefined : <Warning />}
        >
          {slot.pacingStatus === 'physically_full' 
            ? 'Cannot Override - No Tables' 
            : loading 
              ? 'Confirming...' 
              : 'Confirm Override'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OverrideDialog;