import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { OptimizedBookingForm } from './OptimizedBookingForm';
import { Booking } from '../../types';

interface QuickBookingDialogProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: (booking: Booking) => void;
  booking?: Booking | null;
  editMode?: boolean;
}

export const QuickBookingDialog: React.FC<QuickBookingDialogProps> = ({
  open,
  onClose,
  restaurantId,
  onSuccess,
  booking,
  editMode = false
}) => {
  const handleSuccess = (booking: Booking) => {
    onSuccess(booking);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {editMode ? 'Edit Booking' : 'Quick Booking'}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <OptimizedBookingForm
          restaurantId={restaurantId}
          onSuccess={handleSuccess}
          onCancel={onClose}
          booking={booking}
          editMode={editMode}
        />
      </DialogContent>
    </Dialog>
  );
};