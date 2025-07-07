import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Menu,
  MenuItem,
  Divider,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import {
  Search,
  Person,
  Phone,
  Email,
  People,
  AccessTime,
  TableBar,
  MoreVert,
  Edit,
  Cancel,
  Visibility,
  Restaurant,
  CheckCircle,
  Schedule,
  ErrorOutline,
  Delete,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useDateFormat } from '../../contexts/DateFormatContext';
import { bookingService } from '../../services/api';
import { Booking } from '../../types';
import { parseBookingDateTime } from '../../utils/dateHelpers';
import BookingDetails from './BookingDetails';
import { QuickBookingDialog } from './QuickBookingDialog';

interface BookingDayViewProps {
  bookings: Booking[];
  selectedDate: Date;
  onBookingUpdate: () => void;
}

const BookingDayView: React.FC<BookingDayViewProps> = ({
  bookings,
  selectedDate,
  onBookingUpdate
}) => {
  const { formatDate, formatBookingTime, restaurantSettings } = useDateFormat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuBooking, setMenuBooking] = useState<Booking | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Filter bookings based on search term
  const filteredBookings = useMemo(() => {
    if (!searchTerm) return bookings;
    
    const term = searchTerm.toLowerCase();
    return bookings.filter(booking => 
      booking.customerName.toLowerCase().includes(term) ||
      booking.customerEmail?.toLowerCase().includes(term) ||
      booking.customerPhone?.includes(term) ||
      booking.confirmationCode?.toLowerCase().includes(term) ||
      booking.tableNumber?.toString().includes(term)
    );
  }, [bookings, searchTerm]);

  // Sort bookings by time
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const timeA = parseBookingDateTime(a);
      const timeB = parseBookingDateTime(b);
      if (!timeA || !timeB) return 0;
      return timeA.getTime() - timeB.getTime();
    });
  }, [filteredBookings]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const totalGuests = bookings.reduce((sum, b) => sum + b.partySize, 0);
    
    return { total, confirmed, pending, cancelled, totalGuests };
  }, [bookings]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle fontSize="small" />;
      case 'pending': return <Schedule fontSize="small" />;
      case 'cancelled': return <Cancel fontSize="small" />;
      case 'completed': return <Restaurant fontSize="small" />;
      case 'no_show': return <ErrorOutline fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, booking: Booking) => {
    setMenuAnchor(event.currentTarget);
    setMenuBooking(booking);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuBooking(null);
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
    handleMenuClose();
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditOpen(true);
    handleMenuClose();
  };

  const handleBookingUpdated = () => {
    onBookingUpdate();
    setEditOpen(false);
    setSelectedBooking(null);
  };

  const handleDeleteBooking = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleCancelBooking = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      await bookingService.cancelBooking(bookingToDelete.id);
      setSnackbarMessage(`Booking for ${bookingToDelete.customerName} has been cancelled`);
      setSnackbarOpen(true);
      onBookingUpdate(); // Refresh the bookings list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setSnackbarMessage('Failed to cancel booking. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setDeleteConfirmOpen(false);
      setBookingToDelete(null);
    }
  };

  const cancelDeleteBooking = () => {
    setDeleteConfirmOpen(false);
    setBookingToDelete(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Day Statistics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Bookings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {stats.totalGuests}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Guests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {stats.confirmed}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Confirmed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {!restaurantSettings?.bookingSettings?.autoConfirm && (
          <Grid item xs={6} sm={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
              color: 'white'
            }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.pending}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search bookings by name, email, phone, or confirmation code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Bookings List */}
      {sortedBookings.length === 0 ? (
        <Alert 
          severity="info" 
          sx={{ 
            textAlign: 'center',
            py: 4
          }}
        >
          <Typography variant="h6" gutterBottom>
            No bookings found
          </Typography>
          <Typography variant="body2">
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : `No bookings scheduled for ${formatDate(selectedDate, 'long')}`
            }
          </Typography>
        </Alert>
      ) : (
        <Card>
          <List sx={{ p: 0 }}>
            {sortedBookings.map((booking, index) => (
              <React.Fragment key={booking.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 3,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onClick={() => handleViewDetails(booking)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: getStatusColor(booking.status) === 'success' ? 'success.main' :
                               getStatusColor(booking.status) === 'warning' ? 'warning.main' :
                               getStatusColor(booking.status) === 'error' ? 'error.main' : 'grey.500'
                    }}>
                      {getStatusIcon(booking.status)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {booking.customerName}
                        </Typography>
                        <Chip 
                          label={booking.status}
                          color={getStatusColor(booking.status) as any}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {booking.confirmationCode}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime fontSize="small" />
                          <Typography variant="body2">
                            {formatBookingTime(booking)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <People fontSize="small" />
                          <Typography variant="body2">
                            {booking.partySize} guest{booking.partySize !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        
                        {booking.tableNumber && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TableBar fontSize="small" />
                            <Typography variant="body2">
                              Table {booking.tableNumber}
                            </Typography>
                          </Box>
                        )}
                        
                        {booking.customerPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone fontSize="small" />
                            <Typography variant="body2">
                              {booking.customerPhone}
                            </Typography>
                          </Box>
                        )}
                        
                        {booking.customerEmail && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email fontSize="small" />
                            <Typography variant="body2">
                              {booking.customerEmail}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    }
                  />
                  
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, booking);
                    }}
                    size="small"
                  >
                    <MoreVert />
                  </IconButton>
                </ListItem>
                
                {index < sortedBookings.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuBooking && handleViewDetails(menuBooking)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => menuBooking && handleEditBooking(menuBooking)}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Booking
        </MenuItem>
        {menuBooking && menuBooking.status !== 'cancelled' && menuBooking.status !== 'completed' && (
          <MenuItem 
            onClick={() => menuBooking && handleCancelBooking(menuBooking)}
            sx={{ color: 'warning.main' }}
          >
            <Cancel fontSize="small" sx={{ mr: 1 }} />
            Cancel Booking
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => menuBooking && handleDeleteBooking(menuBooking)}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Booking
        </MenuItem>
      </Menu>

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetails
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
        />
      )}

      {/* Edit Booking Dialog */}
      {selectedBooking && (
        <QuickBookingDialog
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setSelectedBooking(null);
          }}
          restaurantId={selectedBooking.restaurantId}
          booking={selectedBooking}
          editMode={true}
          onSuccess={handleBookingUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={cancelDeleteBooking}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Booking Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the booking for{' '}
            <strong>{bookingToDelete?.customerName}</strong> on{' '}
            <strong>{bookingToDelete && formatBookingTime(bookingToDelete)}</strong>?
            <br /><br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteBooking} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteBooking} color="error" variant="contained">
            Delete Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default BookingDayView;