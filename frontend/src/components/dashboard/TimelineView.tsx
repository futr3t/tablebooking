import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Tooltip,
  useTheme,
  Fade,
  Slide,
  Grow,
  Zoom,
  IconButton,
} from '@mui/material';
import { format } from 'date-fns';
import { Booking } from '../../types';
import { People, Phone, Schedule, Person, Visibility, Edit, MoreVert } from '@mui/icons-material';
import { parseBookingDateTime, formatBookingTime } from '../../utils/dateHelpers';
import { useDateFormat } from '../../contexts/DateFormatContext';

interface TimelineViewProps {
  bookings: Booking[];
  onBookingUpdate: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ bookings, onBookingUpdate }) => {
  const theme = useTheme();
  const { restaurantSettings } = useDateFormat();
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const handleBookingClick = useCallback((booking: Booking) => {
    // Handle booking interaction
    console.log('Booking clicked:', booking.id);
  }, []);

  // Calculate dynamic start time based on first service period (for today)
  const calculateFirstServiceHour = () => {
    if (!restaurantSettings?.openingHours) {
      return 12; // Default fallback
    }

    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date();
    const dayOfWeek = today.getDay();
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

  const startHour = calculateFirstServiceHour();
  const endHour = Math.max(startHour + 10, 22); // Ensure at least 10 hours, minimum end at 10 PM
  const totalHours = endHour - startHour;

  const getBookingPosition = (booking: Booking) => {
    const bookingDateTime = parseBookingDateTime(booking);
    if (!bookingDateTime) return 0;
    
    const hour = bookingDateTime.getHours();
    const minutes = bookingDateTime.getMinutes();
    const totalMinutes = (hour - startHour) * 60 + minutes;
    const percentage = (totalMinutes / (totalHours * 60)) * 100;
    return percentage;
  };

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

  const timeSlots = Array.from({ length: totalHours + 1 }, (_, i) => {
    const hour = startHour + i;
    return format(new Date().setHours(hour, 0, 0, 0), 'ha');
  });

  const groupedBookings = bookings.reduce((acc, booking) => {
    const tableId = booking.tableId || 'unassigned';
    if (!acc[tableId]) acc[tableId] = [];
    acc[tableId].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <Box sx={{ 
      position: 'relative', 
      mt: 2,
      px: { xs: 1, sm: 2 },
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      {/* Time Header */}
      <Box sx={{ 
        display: 'flex', 
        mb: { xs: 2, sm: 3 },
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.04)' 
          : 'rgba(248, 250, 252, 0.95)',
        borderRadius: { xs: 3, sm: 4 },
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
          : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
        minHeight: { xs: 56, sm: 60 }
      }}>
        {timeSlots.map((time, index) => (
          <Box
            key={time}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: { xs: 1.5, sm: 2 },
              px: { xs: 0.5, sm: 1 },
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: '1px',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)',
                opacity: index === 0 ? 0 : 1
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.mode === 'dark' 
                  ? '#9ca3af' 
                  : 'text.secondary',
                fontWeight: 600,
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                letterSpacing: '0.5px',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {time}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ 
        position: 'relative', 
        minHeight: { xs: 150, sm: 200 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.02)' 
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
          : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
        overflow: 'hidden',
        p: { xs: 1, sm: 2 }
      }}>
        {Object.entries(groupedBookings).map(([tableId, tableBookings], rowIndex) => {
          // Get table number from the first booking in this group
          const tableNumber = tableBookings[0]?.tableNumber;
          const displayName = tableId === 'unassigned' ? 'Unassigned' : 
                             tableNumber ? `Table ${tableNumber}` : 
                             `Table ${tableId}`;
          
          return (
            <Box
              key={tableId}
              sx={{
                position: 'relative',
                mb: { xs: 1, sm: 1.5 },
                height: { xs: 50, sm: 60 },
                borderBottom: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                animation: `${prefersReducedMotion ? 'none' : 'tableRowSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)'} ${rowIndex * 0.1}s both`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.03)' 
                    : 'rgba(0, 0, 0, 0.02)',
                  transform: 'translateX(4px)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  background: `repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent ${100 / totalHours}%,
                    ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)'} ${100 / totalHours}%,
                    ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)'} ${100 / totalHours + 1}%
                  )`,
                  pointerEvents: 'none',
                  borderRadius: 'inherit'
                },
                '@keyframes tableRowSlideIn': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateY(20px)'
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateY(0)'
                  }
                }
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: { xs: -75, sm: -90 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: { xs: 70, sm: 80 },
                  color: theme.palette.mode === 'dark' 
                    ? '#9ca3af' 
                    : 'text.secondary',
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  textAlign: 'right',
                  pr: { xs: 1, sm: 2 },
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {displayName}
              </Typography>

            {tableBookings.map((booking) => {
              const position = getBookingPosition(booking);
              const duration = 90;
              const width = (duration / (totalHours * 60)) * 100;

              return (
                <Tooltip
                  key={booking.id}
                  title={
                    <Box>
                      <Typography variant="body2">
                        {booking.customerName} - {booking.partySize} guests
                      </Typography>
                      <Typography variant="caption">
                        {formatBookingTime(booking)}
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
                      left: `${position}%`,
                      width: `${width}%`,
                      height: { xs: 42, sm: 50 },
                      background: `linear-gradient(135deg, ${getStatusColor(booking.status)} 0%, ${getStatusColorSecondary(booking.status)} 100%)`,
                      color: 'white',
                      p: { xs: 1, sm: 1.5 },
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderRadius: { xs: 2, sm: 3 },
                      border: `1px solid ${theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(255, 255, 255, 0.3)'}`,
                      boxShadow: theme.palette.mode === 'dark' 
                        ? `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 1px 0 rgba(255, 255, 255, 0.2) inset` 
                        : `0 4px 20px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset`,
                      backdropFilter: 'blur(10px)',
                      animation: `${prefersReducedMotion ? 'none' : 'bookingAppear 0.6s cubic-bezier(0.4, 0, 0.2, 1)'} ${Math.random() * 0.3}s both`,
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
                      ...(loadingStates[booking.id] && {
                        '&::before': {
                          opacity: 0.8,
                          background: 'rgba(255, 255, 255, 0.2)'
                        }
                      }),
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '@keyframes bookingAppear': {
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
                    onClick={() => handleBookingClick(booking)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5 }, mb: { xs: 0.25, sm: 0.5 } }}>
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
                          flex: 1,
                          fontFamily: 'Inter, system-ui, sans-serif'
                        }}
                      >
                        {booking.customerName}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={{ xs: 0.25, sm: 0.5 }} justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={{ xs: 0.25, sm: 0.5 }}>
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
                          {booking.partySize}
                        </Typography>
                      </Box>
                      <Chip
                        label={booking.status}
                        size="small"
                        sx={{
                          height: { xs: 16, sm: 18 },
                          fontSize: { xs: '0.55rem', sm: '0.6rem' },
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          border: '1px solid rgba(255,255,255,0.3)',
                          backdropFilter: 'blur(5px)',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            animation: prefersReducedMotion ? 'none' : 'statusShimmer 3s ease-in-out infinite',
                            '@keyframes statusShimmer': {
                              '0%': { left: '-100%' },
                              '100%': { left: '100%' }
                            }
                          },
                          '& .MuiChip-label': {
                            px: { xs: 0.5, sm: 1 },
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            position: 'relative',
                            zIndex: 1
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Tooltip>
              );
            })}
          </Box>
          );
        })}
      </Box>

      <Box sx={{ 
        mt: 3, 
        display: 'flex', 
        gap: { xs: 1, sm: 2 }, 
        flexWrap: 'wrap',
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.02)' 
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
          : '0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8) inset'
      }}>
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <Box
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              background: `linear-gradient(135deg, ${getStatusColor('confirmed')} 0%, ${getStatusColorSecondary('confirmed')} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset' 
                : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0',
                height: '0',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '50%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'translate(-50%, -50%)',
                animation: prefersReducedMotion ? 'none' : 'legendPulse 2s ease-in-out infinite',
                '@keyframes legendPulse': {
                  '0%, 100%': { opacity: 0.3 },
                  '50%': { opacity: 0.8 }
                }
              }
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: theme.palette.primary.main,
              transform: 'translateX(2px)'
            }
          }}>Confirmed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <Box
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              background: `linear-gradient(135deg, ${getStatusColor('pending')} 0%, ${getStatusColorSecondary('pending')} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset' 
                : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: theme.palette.warning.main,
              transform: 'translateX(2px)'
            }
          }}>Pending</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <Box
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              background: `linear-gradient(135deg, ${getStatusColor('completed')} 0%, ${getStatusColorSecondary('completed')} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset' 
                : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: theme.palette.info.main,
              transform: 'translateX(2px)'
            }
          }}>Completed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <Box
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              background: `linear-gradient(135deg, ${getStatusColor('cancelled')} 0%, ${getStatusColorSecondary('cancelled')} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset' 
                : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: theme.palette.error.main,
              transform: 'translateX(2px)'
            }
          }}>Cancelled</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <Box
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              background: `linear-gradient(135deg, ${getStatusColor('no_show')} 0%, ${getStatusColorSecondary('no_show')} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset' 
                : '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: theme.palette.text.secondary,
              transform: 'translateX(2px)'
            }
          }}>No Show</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineView;