import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Tooltip,
  useTheme,
  Alert,
  IconButton,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar,
} from '@mui/material';
import {
  People,
  Phone,
  MoreVert,
  Edit,
  Visibility,
  TableBar,
  Delete,
  Cancel,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Booking, Table } from '../../types';
import { parseBookingDateTime, formatBookingTime } from '../../utils/dateHelpers';
import { useDateFormat } from '../../contexts/DateFormatContext';
import { bookingService } from '../../services/api';
import BookingDetails from './BookingDetails';
import { QuickBookingDialog } from './QuickBookingDialog';

interface BookingTimelineViewProps {
  bookings: Booking[];
  tables: Table[];
  selectedDate: Date;
  onBookingUpdate: () => void;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface PositionedBooking extends Booking {
  left: number;
  width: number;
  tableRowIndex: number;
}

const BookingTimelineView: React.FC<BookingTimelineViewProps> = ({
  bookings,
  tables,
  selectedDate,
  onBookingUpdate
}) => {
  const theme = useTheme();
  const { restaurantSettings, formatDate } = useDateFormat();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuBooking, setMenuBooking] = useState<Booking | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Calculate dynamic start time based on first service period
  const calculateFirstServiceHour = () => {
    if (!restaurantSettings?.openingHours) {
      return 12; // Default fallback
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = restaurantSettings.openingHours[dayName];
    
    if (!daySchedule?.isOpen || !daySchedule.periods || daySchedule.periods.length === 0) {
      return 12; // Default fallback if closed or no periods
    }

    // Find the earliest start time among all service periods
    let earliestHour = 24; // Start with impossible hour
    
    daySchedule.periods.forEach((period: any) => {
      if (period.startTime) {
        const [hours, minutes] = period.startTime.split(':').map(Number);
        const hourWithMinutes = hours + (minutes / 60);
        if (hourWithMinutes < earliestHour) {
          earliestHour = hourWithMinutes;
        }
      }
    });
    
    return earliestHour < 24 ? Math.floor(earliestHour) : 12;
  };

  // Timeline configuration
  const startHour = calculateFirstServiceHour();
  const endHour = Math.max(startHour + 10, 22); // Ensure at least 10 hours, minimum end at 10 PM
  const totalHours = endHour - startHour;
  const slotMinutes = 30; // 30-minute intervals
  const totalSlots = (totalHours * 60) / slotMinutes;

  // Generate time slots
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    for (let i = 0; i <= totalSlots; i++) {
      const totalMinutes = i * slotMinutes;
      const hour = startHour + Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      
      if (hour <= endHour) {
        slots.push({
          hour,
          minute,
          label: format(new Date().setHours(hour, minute, 0, 0), 'h:mm a')
        });
      }
    }
    return slots;
  }, []);

  // Sort tables by number for consistent display
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [tables]);

  // Position bookings on the timeline
  const positionedBookings = useMemo(() => {
    const positioned: PositionedBooking[] = [];

    bookings.forEach(booking => {
      const bookingDateTime = parseBookingDateTime(booking);
      if (!bookingDateTime) return;

      // Find table row index
      const tableRowIndex = sortedTables.findIndex(table => table.id === booking.tableId);
      if (tableRowIndex === -1) return; // Skip if table not found

      // Calculate position
      const bookingHour = bookingDateTime.getHours();
      const bookingMinute = bookingDateTime.getMinutes();
      
      // Minutes from start of timeline
      const minutesFromStart = (bookingHour - startHour) * 60 + bookingMinute;
      
      // Skip if booking is outside timeline hours
      if (minutesFromStart < 0 || minutesFromStart > totalHours * 60) return;

      // Calculate left position as percentage
      const left = (minutesFromStart / (totalHours * 60)) * 100;
      
      // Calculate width based on duration
      const duration = booking.duration || 90; // Default 90 minutes
      const width = (duration / (totalHours * 60)) * 100;

      positioned.push({
        ...booking,
        left,
        width,
        tableRowIndex
      });
    });

    return positioned;
  }, [bookings, sortedTables]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return theme.palette.success.main;
      case 'pending': return theme.palette.warning.main;
      case 'cancelled': return theme.palette.error.main;
      case 'completed': return theme.palette.info.main;
      case 'no_show': return theme.palette.grey[500];
      default: return theme.palette.grey[400];
    }
  };

  const handleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    // Default action: view booking details
    handleViewDetails(booking);
  };

  const handleMenuClick = (booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget as HTMLElement);
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

  if (sortedTables.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            No tables configured
          </Typography>
          <Typography variant="body2">
            Please configure tables for your restaurant to use the timeline view.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Timeline Header */}
      <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Timeline View - {formatDate(selectedDate, 'long')}
      </Typography>

      {/* No Bookings Message */}
      {bookings.length === 0 ? (
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
            No bookings scheduled for {formatDate(selectedDate, 'long')}
          </Typography>
        </Alert>
      ) : (
        <>
          {/* Timeline Container */}
          <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        {/* Time Header */}
        <Box sx={{ 
          display: 'flex',
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'grey.50'
        }}>
          {/* Table column header */}
          <Box sx={{ 
            width: 120, 
            p: 2,
            borderRight: 1,
            borderColor: 'divider',
            backgroundColor: 'grey.100'
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Tables
            </Typography>
          </Box>
          
          {/* Time slots header */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            position: 'relative',
            minWidth: 800 // Ensure minimum width for readability
          }}>
            {timeSlots.map((slot, index) => (
              <Box
                key={`${slot.hour}-${slot.minute}`}
                sx={{
                  position: 'absolute',
                  left: `${(index / totalSlots) * 100}%`,
                  transform: 'translateX(-50%)',
                  p: 1,
                  borderLeft: index > 0 ? 1 : 0,
                  borderColor: 'divider',
                  minWidth: 60,
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {slot.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timeline Body */}
        <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
          {sortedTables.map((table, tableIndex) => {
            const tableBookings = positionedBookings.filter(
              booking => booking.tableRowIndex === tableIndex
            );

            return (
              <Box
                key={table.id}
                sx={{
                  display: 'flex',
                  borderBottom: tableIndex < sortedTables.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  minHeight: 80,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                {/* Table Info */}
                <Box sx={{ 
                  width: 120,
                  p: 2,
                  borderRight: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'grey.50'
                }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {table.number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {table.minCapacity}-{table.maxCapacity} guests
                    </Typography>
                    {table.tableType && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {table.tableType}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Timeline Row */}
                <Box sx={{ 
                  flex: 1,
                  position: 'relative',
                  minHeight: 80,
                  minWidth: 800 // Match header width
                }}>
                  {/* Grid lines */}
                  {timeSlots.map((slot, index) => (
                    <Box
                      key={`grid-${table.id}-${index}`}
                      sx={{
                        position: 'absolute',
                        left: `${(index / totalSlots) * 100}%`,
                        top: 0,
                        bottom: 0,
                        borderLeft: index > 0 ? 1 : 0,
                        borderColor: 'divider',
                        opacity: 0.3
                      }}
                    />
                  ))}

                  {/* Booking Blocks */}
                  {tableBookings.map(booking => (
                    <Tooltip
                      key={booking.id}
                      title={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {booking.customerName} - {booking.partySize} guests
                          </Typography>
                          <Typography variant="caption">
                            {formatBookingTime(booking)} ({booking.duration}min)
                          </Typography>
                          <Typography variant="caption" display="block">
                            Status: {booking.status}
                          </Typography>
                          {booking.customerPhone && (
                            <Typography variant="caption" display="block">
                              <Phone fontSize="small" /> {booking.customerPhone}
                            </Typography>
                          )}
                          {booking.specialRequests && (
                            <Typography variant="caption" display="block">
                              Note: {booking.specialRequests}
                            </Typography>
                          )}
                        </Box>
                      }
                    >
                      <Paper
                        elevation={2}
                        sx={{
                          position: 'absolute',
                          left: `${booking.left}%`,
                          width: `${Math.max(booking.width, 8)}%`, // Minimum width for visibility
                          top: 10,
                          bottom: 10,
                          backgroundColor: getStatusColor(booking.status),
                          color: 'white',
                          p: 1,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          overflow: 'hidden',
                          '&:hover': {
                            opacity: 0.9,
                            transform: 'scale(1.02)',
                            zIndex: 10
                          },
                          transition: 'all 0.2s',
                          zIndex: 1
                        }}
                        onClick={(e) => handleBookingClick(booking, e)}
                      >
                        <Box sx={{ overflow: 'hidden', flex: 1 }}>
                          <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                            {booking.customerName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People fontSize="small" />
                            <Typography variant="caption">
                              {booking.partySize}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <IconButton
                          size="small"
                          sx={{ color: 'inherit', opacity: 0.8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuClick(booking, e);
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Booking Stats */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Timeline Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${bookings.length} bookings`}
              color="primary"
              variant="outlined"
            />
            <Chip 
              label={`${bookings.reduce((sum, b) => sum + b.partySize, 0)} total guests`}
              color="secondary"
              variant="outlined"
            />
            <Chip 
              label={`${sortedTables.length} tables`}
              color="default"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>
        </>
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

export default BookingTimelineView;