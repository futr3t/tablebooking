import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { parseISO } from 'date-fns';
import { Booking } from '../../types';
import { useDateFormat } from '../../contexts/DateFormatContext';
import {
  Person,
  Email,
  Phone,
  People,
  CalendarToday,
  TableBar,
  ConfirmationNumber,
  Notes,
} from '@mui/icons-material';

interface BookingDetailsProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ open, onClose, booking }) => {
  const { formatDateTime, formatBookingDate, formatBookingTime } = useDateFormat();
  
  if (!booking) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      case 'no_show': return 'default';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Booking Details</Typography>
          <Chip
            label={booking.status}
            color={getStatusColor(booking.status) as any}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" mb={1}>
              <Person sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="bold">
                {booking.customerName}
              </Typography>
            </Box>
          </Grid>

          {booking.customerEmail && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center">
                <Email sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                <Typography variant="body2">{booking.customerEmail}</Typography>
              </Box>
            </Grid>
          )}

          {booking.customerPhone && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center">
                <Phone sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                <Typography variant="body2">{booking.customerPhone}</Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center">
              <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Date & Time
                </Typography>
                <Typography variant="body1">
                  {formatBookingDate(booking)}
                </Typography>
                <Typography variant="body1">
                  {formatBookingTime(booking)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center">
              <People sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Party Size
                </Typography>
                <Typography variant="body1">{booking.partySize} guests</Typography>
              </Box>
            </Box>
          </Grid>

          {(booking.tableId || booking.tableNumber) && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center">
                <TableBar sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Table Assignment
                  </Typography>
                  <Typography variant="body1">
                    {booking.tableNumber ? `Table ${booking.tableNumber}` : 
                     booking.tableId ? `Table ${booking.tableId}` : 'Not assigned'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center">
              <ConfirmationNumber sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Confirmation Code
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {booking.confirmationCode}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {booking.specialRequests && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" alignItems="flex-start">
                  <Notes sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Special Requests
                    </Typography>
                    <Typography variant="body2">{booking.specialRequests}</Typography>
                  </Box>
                </Box>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Created: {formatDateTime(parseISO(booking.createdAt), 'display')}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Last Updated: {formatDateTime(parseISO(booking.updatedAt), 'display')}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingDetails;