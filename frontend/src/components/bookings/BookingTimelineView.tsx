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
  Fade,
  Slide,
  Grow,
  Zoom,
  CircularProgress,
  Skeleton,
  Backdrop,
  useMediaQuery,
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
  const [animationKey, setAnimationKey] = useState(0);
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [clickedBooking, setClickedBooking] = useState<string | null>(null);
  const [pulsingBookings, setPulsingBookings] = useState<Set<string>>(new Set());
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

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
    
    // Add clicked state with ripple effect
    setClickedBooking(booking.id);
    
    // Set loading state for the specific booking
    setLoadingStates(prev => ({ ...prev, [booking.id]: true }));
    
    // Add tactile feedback delay
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [booking.id]: false }));
      setClickedBooking(null);
      handleViewDetails(booking);
    }, prefersReducedMotion ? 50 : 200);
  }, [prefersReducedMotion]);

  const handleMenuClick = useCallback((booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Add pulse animation to indicate menu opening
    setPulsingBookings(prev => new Set([...prev, booking.id]));
    
    setMenuAnchor(event.currentTarget as HTMLElement);
    setMenuBooking(booking);
    
    // Remove pulse after menu opens
    setTimeout(() => {
      setPulsingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(booking.id);
        return newSet;
      });
    }, 300);
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

  // Component mount animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentReady(true);
    }, prefersReducedMotion ? 0 : 100);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  // Trigger animation when bookings change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [bookings.length]);

  if (sortedTables.length === 0) {
    return (
      <Fade in timeout={prefersReducedMotion ? 0 : 600}>
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="info"
            sx={{
              borderRadius: 3,
              backdropFilter: 'blur(20px)',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'rgba(59, 130, 246, 0.05)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                animation: prefersReducedMotion ? 'none' : 'shimmer 3s ease-in-out infinite',
                borderRadius: 'inherit',
                pointerEvents: 'none'
              },
              '@keyframes shimmer': {
                '0%': { transform: 'translateX(-100%)' },
                '100%': { transform: 'translateX(100%)' }
              }
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
      </Fade>
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
      <Slide in={isComponentReady} direction="down" timeout={prefersReducedMotion ? 0 : 800}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 2, sm: 3 },
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          ...(theme.palette.mode === 'dark' && {
            backgroundColor: 'rgba(0, 0, 0, 0.9)'
          }),
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          mx: -1,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
            : '0 8px 32px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.6), transparent)',
            animation: prefersReducedMotion ? 'none' : 'headerGlow 4s ease-in-out infinite',
            borderRadius: 'inherit'
          },
          '@keyframes headerGlow': {
            '0%, 100%': { opacity: 0.3 },
            '50%': { opacity: 1 }
          }
        }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          color: 'text.primary',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Timeline View - {formatDate(selectedDate, 'long')}
        </Typography>
        </Box>
      </Slide>

      {/* No Bookings Message */}
      {bookings.length === 0 ? (
        <Grow in={isComponentReady} timeout={prefersReducedMotion ? 0 : 1000}>
          <Alert 
            severity="info" 
            sx={{ 
              textAlign: 'center',
              py: { xs: 3, sm: 4 },
              borderRadius: 4,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'rgba(59, 130, 246, 0.05)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: prefersReducedMotion ? 'none' : 'slideShimmer 2s ease-in-out infinite',
                '@keyframes slideShimmer': {
                  '0%': { left: '-100%' },
                  '100%': { left: '100%' }
                }
              }
            }}
          >
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'text.primary'
          }}>
            No bookings found
          </Typography>
          <Typography variant="body2" sx={{ 
            color: 'text.secondary',
            fontSize: { xs: '0.875rem', sm: '0.925rem' }
          }}>
            No bookings scheduled for {formatDate(selectedDate, 'long')}
          </Typography>
          </Alert>
        </Grow>
      ) : (
        <>
          {/* Timeline Container */}
          <Zoom in={isComponentReady} timeout={prefersReducedMotion ? 0 : 1200}>
            <Paper elevation={0} sx={{ 
              overflow: 'hidden',
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.02)' 
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
                : '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
                borderRadius: 'inherit',
                animation: prefersReducedMotion ? 'none' : 'ambientGlow 8s ease-in-out infinite',
                '@keyframes ambientGlow': {
                  '0%, 100%': { opacity: 0.3 },
                  '50%': { opacity: 0.7 }
                }
              }
            }}>
            {/* Time Header */}
            <Box sx={{ 
              display: 'flex',
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.04)' 
                : 'rgba(248, 250, 252, 0.95)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backdropFilter: 'blur(20px)',
              minHeight: { xs: 56, sm: 60 }
            }}>
              {/* Table column header */}
              <Box sx={{ 
                width: { xs: 100, sm: 120 },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.5, sm: 2 },
                borderRight: '1px solid',
                borderColor: 'divider',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.06)' 
                  : 'rgba(241, 245, 249, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 700,
                    color: theme.palette.mode === 'dark' 
                      ? 'text.primary' 
                      : 'text.secondary',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    fontFamily: 'Inter, system-ui, sans-serif'
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
                minWidth: { xs: 600, sm: 800, md: 1000 },
                height: { xs: 48, sm: 56 },
                overflow: 'hidden'
              }}>
                {timeSlots.map((slot, index) => (
                  <Box
                    key={`${slot.hour}-${slot.minute}`}
                    sx={{
                      position: 'absolute',
                      left: `${(index / totalSlots) * 100}%`,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minWidth: 50,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '1px',
                        height: '100%',
                        backgroundColor: 'divider',
                        opacity: index > 0 ? 0.3 : 0
                      }
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        color: theme.palette.mode === 'dark' 
                          ? '#9ca3af' 
                          : 'text.secondary',
                        letterSpacing: '0.5px',
                        fontFamily: 'Inter, system-ui, sans-serif'
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
          maxHeight: { xs: 400, sm: 500, md: 600 },
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(0, 0, 0, 0.3)'
            }
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
                  borderBottom: tableIndex < sortedTables.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  minHeight: { xs: 70, sm: 80 },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    transform: 'translateX(2px)'
                  }
                }}
              >
                {/* Table Info */}
                <Box sx={{ 
                  width: { xs: 100, sm: 120 },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1.5, sm: 2 },
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'rgba(248, 250, 252, 0.5)',
                  transition: 'background-color 0.2s ease-in-out'
                }}>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        color: 'text.primary',
                        mb: 0.5,
                        fontFamily: 'Inter, system-ui, sans-serif'
                      }}
                    >
                      {table.number}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: theme.palette.mode === 'dark' 
                          ? '#9ca3af' 
                          : 'text.secondary',
                        fontSize: { xs: '0.6rem', sm: '0.65rem' },
                        display: 'block',
                        fontWeight: 500,
                        mb: 0.25
                      }}
                    >
                      {table.minCapacity}-{table.maxCapacity} guests
                    </Typography>
                    {table.tableType && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: theme.palette.mode === 'dark' 
                            ? '#9ca3af' 
                            : 'text.secondary',
                          fontSize: { xs: '0.6rem', sm: '0.65rem' },
                          display: 'block',
                          opacity: 0.8,
                          fontWeight: 400
                        }}
                      >
                        {table.tableType}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Timeline Row */}
                <Box sx={{ 
                  flex: 1,
                  position: 'relative',
                  minHeight: { xs: 70, sm: 80 },
                  minWidth: { xs: 600, sm: 800, md: 1000 },
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
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.08)',
                        opacity: index > 0 ? 1 : 0
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
                          top: { xs: 6, sm: 8 },
                          bottom: { xs: 6, sm: 8 },
                          background: `linear-gradient(135deg, ${getStatusColor(booking.status)} 0%, ${getStatusColorSecondary(booking.status)} 100%)`,
                          color: 'white',
                          p: { xs: 1, sm: 1.5 },
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          overflow: 'hidden',
                          borderRadius: { xs: 2, sm: 3 },
                          border: `1px solid ${theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.2)' 
                            : 'rgba(255, 255, 255, 0.3)'}`,
                          boxShadow: theme.palette.mode === 'dark' 
                            ? `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 1px 0 rgba(255, 255, 255, 0.2) inset` 
                            : `0 4px 20px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset`,
                          backdropFilter: 'blur(10px)',
                          animation: `${prefersReducedMotion ? 'none' : 'bookingSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)'} ${Math.random() * 0.3}s both`,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 'inherit',
                            pointerEvents: 'none',
                            opacity: 0,
                            transition: 'opacity 0.2s ease-in-out'
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            transition: 'left 0.6s ease-in-out',
                            opacity: 0
                          },
                          '&:hover': {
                            transform: { xs: 'scale(1.02) translateY(-1px)', sm: 'scale(1.03) translateY(-2px)' },
                            boxShadow: theme.palette.mode === 'dark' 
                              ? `0 16px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.15) inset, 0 2px 0 rgba(255, 255, 255, 0.25) inset` 
                              : `0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 0 rgba(255, 255, 255, 0.5) inset`,
                            zIndex: 10,
                            '&::before': {
                              opacity: 1
                            },
                            '&::after': {
                              left: '100%',
                              opacity: 1
                            }
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: 2,
                            boxShadow: `0 0 0 4px ${theme.palette.primary.main}20`
                          },
                          ...(clickedBooking === booking.id && {
                            transform: 'scale(0.98)',
                            boxShadow: theme.palette.mode === 'dark' 
                              ? `0 4px 16px rgba(0, 0, 0, 0.8) inset, 0 0 0 1px rgba(255, 255, 255, 0.1) inset` 
                              : `0 4px 16px rgba(0, 0, 0, 0.15) inset, 0 1px 0 rgba(255, 255, 255, 0.4) inset`
                          }),
                          ...(pulsingBookings.has(booking.id) && {
                            animation: prefersReducedMotion ? 'none' : 'bookingPulse 0.6s ease-in-out',
                            '@keyframes bookingPulse': {
                              '0%': { transform: 'scale(1)' },
                              '50%': { transform: 'scale(1.05)' },
                              '100%': { transform: 'scale(1)' }
                            }
                          }),
                          ...(loadingStates[booking.id] && {
                            '&::before': {
                              opacity: 0.8,
                              background: 'rgba(255, 255, 255, 0.2)'
                            }
                          }),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          zIndex: 1,
                          '@keyframes bookingSlideIn': {
                            '0%': {
                              opacity: 0,
                              transform: 'translateX(-20px) scale(0.95)'
                            },
                            '100%': {
                              opacity: 1,
                              transform: 'translateX(0) scale(1)'
                            }
                          }
                        }}
                        onClick={(e) => handleBookingClick(booking, e)}
                      >
                        <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5 }, mb: 0.5 }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 700,
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                letterSpacing: '0.5px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                              }}
                            >
                              {getStatusIcon(booking.status)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              noWrap 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                letterSpacing: '0.25px',
                                fontFamily: 'Inter, system-ui, sans-serif'
                              }}
                            >
                              {booking.customerName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5 } }}>
                            <People fontSize="small" sx={{ opacity: 0.9 }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 500,
                                fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                opacity: 0.95,
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                              }}
                            >
                              {booking.partySize} guests
                            </Typography>
                          </Box>
                        </Box>
                        
                        <IconButton
                          size="small"
                          sx={{ 
                            color: 'inherit', 
                            opacity: 0.8,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 1.5,
                            width: { xs: 24, sm: 28 },
                            height: { xs: 24, sm: 28 },
                            ml: { xs: 0.5, sm: 1 },
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              width: '0',
                              height: '0',
                              background: 'rgba(255, 255, 255, 0.3)',
                              borderRadius: '50%',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: 'translate(-50%, -50%)'
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              opacity: 1,
                              transform: 'scale(1.1)',
                              '&::before': {
                                width: '100%',
                                height: '100%'
                              }
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                              '&::before': {
                                background: 'rgba(255, 255, 255, 0.4)'
                              }
                            },
                            '&:focus-visible': {
                              outline: `2px solid rgba(255, 255, 255, 0.8)`,
                              outlineOffset: 2
                            },
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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
          </Zoom>

      {/* Booking Stats */}
      <Slide in={isComponentReady} direction="up" timeout={prefersReducedMotion ? 0 : 1400}>
        <Card sx={{ 
          mt: 3,
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.02)' 
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent)',
            animation: prefersReducedMotion ? 'none' : 'borderGlow 3s ease-in-out infinite',
            '@keyframes borderGlow': {
              '0%, 100%': { opacity: 0.2 },
              '50%': { opacity: 1 }
            }
          }
        }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'text.primary',
            mb: 2,
            fontFamily: 'Inter, system-ui, sans-serif'
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
      </Slide>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        TransitionComponent={Fade}
        transitionDuration={prefersReducedMotion ? 0 : 200}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(28, 28, 30, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 20px 40px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
              : '0 20px 40px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
            '& .MuiMenuItem-root': {
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(59, 130, 246, 0.08)',
                transform: 'translateX(4px)'
              }
            }
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
        TransitionComponent={Zoom}
        transitionDuration={prefersReducedMotion ? 0 : 300}
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
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
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