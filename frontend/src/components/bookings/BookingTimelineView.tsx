import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
  Schedule,
  Person,
  Check,
  Close,
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
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Removed animation-related state for performance

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
      case 'confirmed': return theme.palette.mode === 'dark' ? '#10b981' : '#059669'; // Emerald
      case 'pending': return theme.palette.mode === 'dark' ? '#f59e0b' : '#d97706'; // Amber
      case 'cancelled': return theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626'; // Red
      case 'completed': return theme.palette.mode === 'dark' ? '#06b6d4' : '#0891b2'; // Cyan
      case 'no_show': return theme.palette.mode === 'dark' ? '#6b7280' : '#4b5563'; // Gray
      default: return theme.palette.mode === 'dark' ? '#6b7280' : '#4b5563';
    }
  };

  const getStatusColorSecondary = (status: string) => {
    switch (status) {
      case 'confirmed': return theme.palette.mode === 'dark' ? '#065f46' : '#047857'; // Darker emerald
      case 'pending': return theme.palette.mode === 'dark' ? '#92400e' : '#b45309'; // Darker amber
      case 'cancelled': return theme.palette.mode === 'dark' ? '#991b1b' : '#b91c1c'; // Darker red
      case 'completed': return theme.palette.mode === 'dark' ? '#0e7490' : '#0c7990'; // Darker cyan
      case 'no_show': return theme.palette.mode === 'dark' ? '#374151' : '#374151'; // Darker gray
      default: return theme.palette.mode === 'dark' ? '#374151' : '#374151';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓';
      case 'pending': return '⏳';
      case 'cancelled': return '✕';
      case 'completed': return '✓';
      case 'no_show': return '⚠';
      default: return '?';
    }
  };

  const handleBookingClick = useCallback((booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    handleViewDetails(booking);
  }, []);

  const handleMenuClick = useCallback((booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget as HTMLElement);
    setMenuBooking(booking);
  }, []);

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
          <Alert 
            severity="info"
            sx={{
              backgroundColor: theme.palette.mode === 'dark' 
                ? '#1e293b' // slate-800 solid
                : '#f1f5f9', // slate-100 solid
              border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#cbd5e1'}`, // slate-700 / slate-300
              borderRadius: 0 // Square corners
            }}
          >
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
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      position: 'relative',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      {/* Timeline Header */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff', // solid colors
          border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          borderRadius: 0, // Square corners
          p: 2
        }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          fontSize: '1.25rem',
          color: 'text.primary',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Timeline View - {formatDate(selectedDate, 'long')}
        </Typography>
        </Box>

      {/* No Bookings Message */}
      {bookings.length === 0 ? (
          <Alert 
            severity="info" 
            sx={{ 
              textAlign: 'center',
              py: 3,
              backgroundColor: theme.palette.mode === 'dark' 
                ? '#1e293b' // slate-800 solid
                : '#f1f5f9', // slate-100 solid
              border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#cbd5e1'}`, // slate-700 / slate-300
              borderRadius: 0 // Square corners
            }}
          >
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600,
            fontSize: '1.1rem',
            color: 'text.primary'
          }}>
            No bookings found
          </Typography>
          <Typography variant="body2" sx={{ 
            color: 'text.secondary',
            fontSize: '0.875rem'
          }}>
            No bookings scheduled for {formatDate(selectedDate, 'long')}
          </Typography>
          </Alert>
      ) : (
        <>
          {/* Timeline Container - Optimized for Performance */}
            <Paper elevation={0} sx={{ 
              overflow: 'hidden',
              borderRadius: 0, // Square corners
              border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`, // solid borders
              backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff', // solid colors
              position: 'relative'
            }}>
            {/* Time Header */}
            <Box sx={{ 
              display: 'flex',
              borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
              backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f8fafc', // solid colors
              position: 'sticky',
              top: 0,
              zIndex: 10,
              height: 32 // Reduced height for performance
            }}>
              {/* Table column header */}
              <Box sx={{ 
                width: 120,
                px: 1,
                py: 0.5, // Reduced padding
                borderRight: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                backgroundColor: theme.palette.mode === 'dark' ? '#475569' : '#f1f5f9', // solid colors
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#475569',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase'
                  }}
                >
                  Tables
                </Typography>
              </Box>
              
              {/* Time slots header */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                position: 'relative',
                minWidth: 800,
                height: 32,
                overflow: 'hidden'
              }}>
                {timeSlots.map((slot, index) => (
                  <Box
                    key={`${slot.hour}-${slot.minute}`}
                    sx={{
                      position: 'absolute',
                      left: `${(index / totalSlots) * 100}%`,
                      marginLeft: '-25px', // Fixed positioning instead of transform
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minWidth: 50,
                      borderLeft: index > 0 ? `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}` : 'none'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#64748b'
                      }}
                    >
                      {slot.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

        {/* Timeline Body */}
        <Box sx={{ 
          maxHeight: 600,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' ? '#475569' : '#f1f5f9'
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? '#64748b' : '#cbd5e1'
          }
        }}>
          {sortedTables.map((table, tableIndex) => {
            const tableBookings = positionedBookings.filter(
              booking => booking.tableRowIndex === tableIndex
            );

            return (
              <Box
                key={table.id}
                sx={{
                  display: 'flex',
                  borderBottom: tableIndex < sortedTables.length - 1 ? `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}` : 'none',
                  height: 32 // Reduced height for performance
                }}
              >
                {/* Table Info */}
                <Box sx={{ 
                  width: 120,
                  px: 1,
                  py: 0.5, // Reduced padding
                  borderRight: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f8fafc' // solid colors
                }}>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
                        lineHeight: 1
                      }}
                    >
                      {table.number} ({table.minCapacity}-{table.maxCapacity})
                    </Typography>
                  </Box>
                </Box>

                {/* Timeline Row */}
                <Box sx={{ 
                  flex: 1,
                  position: 'relative',
                  height: 32, // Fixed height for performance
                  minWidth: 800,
                  overflow: 'hidden'
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
                        width: '1px',
                        backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
                        display: index > 0 ? 'block' : 'none'
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
                        elevation={0}
                        sx={{
                          position: 'absolute',
                          left: `${booking.left}%`,
                          width: `${Math.max(booking.width, 8)}%`, // Minimum width for visibility
                          top: 2,
                          height: 28, // Fixed height for performance
                          backgroundColor: getStatusColor(booking.status), // Solid color instead of gradient
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          overflow: 'hidden',
                          borderRadius: 0, // Square corners
                          border: `1px solid ${theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1'}`
                        }}
                        onClick={(e) => handleBookingClick(booking, e)}
                      >
                        <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="caption" 
                            noWrap 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              color: 'white'
                            }}
                          >
                            {getStatusIcon(booking.status)} {booking.customerName} ({booking.partySize})
                          </Typography>
                        </Box>
                        
                        <IconButton
                          size="small"
                          sx={{ 
                            color: 'white', 
                            width: 20,
                            height: 20,
                            ml: 0.5
                          }}
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
        <Card sx={{ 
          mt: 3,
          borderRadius: 0, // Square corners
          border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff' // solid colors
        }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600,
            fontSize: '1rem',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
            mb: 1
          }}>
            Timeline Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
            <Chip 
              label={`${bookings.length} bookings`}
              color="primary"
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            />
            <Chip 
              label={`${bookings.reduce((sum, b) => sum + b.partySize, 0)} total guests`}
              color="secondary"
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            />
            <Chip 
              label={`${sortedTables.length} tables`}
              color="default"
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
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
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 0, // Square corners
            backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff', // solid colors
            border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`
          }
        }}
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
        PaperProps={{
          sx: {
            borderRadius: 4,
            backdropFilter: 'blur(20px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(28, 28, 30, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 24px 48px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
              : '0 24px 48px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.8) inset'
          }
        }}
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }
        }}
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
          <Button 
            onClick={cancelDeleteBooking} 
            color="primary"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 4px 12px rgba(59, 130, 246, 0.2)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteBooking} 
            color="error" 
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(239, 68, 68, 0.4)'
                  : '0 4px 12px rgba(239, 68, 68, 0.3)'
              }
            }}
          >
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
        sx={{
          '& .MuiSnackbarContent-root': {
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(28, 28, 30, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
              : '0 8px 32px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.8) inset'
          }
        }}
      />
    </Box>
  );
};

export default BookingTimelineView;