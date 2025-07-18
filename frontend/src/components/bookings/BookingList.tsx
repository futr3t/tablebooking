import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Search,
  Edit,
  Cancel,
  Visibility,
  Add,
  NoMeals,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { bookingService } from '../../services/api';
import { Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import BookingDetails from './BookingDetails';
import { QuickBookingDialog } from './QuickBookingDialog';
import { OptimizedBookingForm } from './OptimizedBookingForm';
import { useDateFormat } from '../../contexts/DateFormatContext';

const BookingList: React.FC = () => {
  const { user } = useAuth();
  const { formatBookingDate, formatBookingTime } = useDateFormat();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openQuickBooking, setOpenQuickBooking] = useState(false);
  const [openEnhancedEdit, setOpenEnhancedEdit] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (user?.restaurantId) {
      loadBookings();
    }
  }, [user, showCancelled]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBookings = async () => {
    if (!user?.restaurantId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await bookingService.getBookings(user.restaurantId, undefined, showCancelled);
      setBookings(data);
    } catch (err: any) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const search = searchTerm.toLowerCase();
    return (
      booking.customerName.toLowerCase().includes(search) ||
      booking.customerEmail?.toLowerCase().includes(search) ||
      booking.customerPhone?.includes(search) ||
      booking.confirmationCode?.toLowerCase().includes(search)
    );
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setOpenDetails(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setOpenEnhancedEdit(true);
  };

  const handleAddBooking = () => {
    setOpenQuickBooking(true);
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingService.cancelBooking(booking.id);
        loadBookings();
      } catch (err) {
        console.error('Failed to cancel booking:', err);
      }
    }
  };

  const handleMarkNoShow = async (booking: Booking) => {
    if (window.confirm('Mark this booking as no-show?')) {
      try {
        await bookingService.markNoShow(booking.id);
        loadBookings();
      } catch (err) {
        console.error('Failed to mark as no-show:', err);
      }
    }
  };

  const handleQuickBookingSuccess = () => {
    setOpenQuickBooking(false);
    loadBookings();
  };

  const handleEnhancedEditSuccess = () => {
    setOpenEnhancedEdit(false);
    setSelectedBooking(null);
    loadBookings();
  };

  const handleEnhancedEditClose = () => {
    setOpenEnhancedEdit(false);
    setSelectedBooking(null);
  };

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Bookings</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddBooking}
        >
          Add Booking
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 2 }}>
        <Box p={2}>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name, email, phone, or confirmation code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                />
              }
              label="Show cancelled"
              sx={{ minWidth: 'fit-content' }}
            />
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>Guest Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Party Size</TableCell>
              <TableCell>Table</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Confirmation</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{formatBookingDate(booking)}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatBookingTime(booking)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{booking.customerName}</TableCell>
                  <TableCell>
                    <Box>
                      {booking.customerEmail && (
                        <Typography variant="body2">{booking.customerEmail}</Typography>
                      )}
                      {booking.customerPhone && (
                        <Typography variant="body2">{booking.customerPhone}</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{booking.partySize}</TableCell>
                  <TableCell>
                    {booking.tableNumber ? `Table ${booking.tableNumber}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      color={getStatusColor(booking.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {booking.confirmationCode}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleViewBooking(booking)}
                      title="View details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditBooking(booking)}
                      disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                      title="Edit booking"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleCancelBooking(booking)}
                      disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                      title="Cancel booking"
                    >
                      <Cancel />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMarkNoShow(booking)}
                      disabled={booking.status !== 'confirmed'}
                      title="Mark as no-show"
                    >
                      <NoMeals />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredBookings.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Enhanced Edit Booking Dialog */}
      {selectedBooking && user?.restaurantId && (
        <QuickBookingDialog
          open={openEnhancedEdit}
          onClose={handleEnhancedEditClose}
          restaurantId={user.restaurantId}
          onSuccess={handleEnhancedEditSuccess}
          booking={selectedBooking}
          editMode={true}
        />
      )}

      <BookingDetails
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        booking={selectedBooking}
      />

      {user?.restaurantId && (
        <QuickBookingDialog
          open={openQuickBooking}
          onClose={() => setOpenQuickBooking(false)}
          restaurantId={user.restaurantId}
          onSuccess={handleQuickBookingSuccess}
        />
      )}
    </Box>
  );
};

export default BookingList;