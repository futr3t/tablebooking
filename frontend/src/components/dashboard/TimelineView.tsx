import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { Booking } from '../../types';
import { People, Phone } from '@mui/icons-material';
import { parseBookingDateTime, formatBookingTime } from '../../utils/dateHelpers';
import { useDateFormat } from '../../contexts/DateFormatContext';

interface TimelineViewProps {
  bookings: Booking[];
  onBookingUpdate: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ bookings, onBookingUpdate }) => {
  const theme = useTheme();
  const { restaurantSettings } = useDateFormat();

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
      case 'confirmed': return '#059669'; // emerald-600
      case 'pending': return '#ea580c'; // orange-600
      case 'cancelled': return '#dc2626'; // red-600
      case 'completed': return '#0891b2'; // cyan-600
      case 'no_show': return '#4b5563'; // gray-600
      default: return '#4b5563';
    }
  };

  const getStatusColorSecondary = (status: string) => {
    switch (status) {
      case 'confirmed': return '#047857'; // emerald-700
      case 'pending': return '#c2410c'; // orange-700
      case 'cancelled': return '#b91c1c'; // red-700
      case 'completed': return '#0e7490'; // cyan-700
      case 'no_show': return '#374151'; // gray-700
      default: return '#374151';
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
      gap: 2
    }}>
      {/* Time Header */}
      <Box sx={{ 
        display: 'flex', 
        mb: { xs: 2, sm: 3 },
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800/50
        border: '1px solid #334155', // slate-700
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        height: 48,
        borderRadius: 0 // Square corners
      }}>
        {timeSlots.map((time, index) => (
          <Box
            key={time}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.5,
              px: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: index === 0 ? 'none' : '1px solid #334155', // slate-700
              borderColor: '#334155'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#ffffff', // white headings
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            >
              {time}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ 
        position: 'relative',
        border: '1px solid #334155', // slate-700
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800/50
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'auto',
        p: 1,
        borderRadius: 0 // Square corners
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
                mb: 1,
                height: 48,
                borderBottom: '1px solid #334155', // slate-700
                display: 'grid',
                gridTemplateColumns: `repeat(${totalHours}, 1fr)`,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: -80,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 75,
                  color: '#ffffff', // white headings
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textAlign: 'right',
                  pr: 1
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
                      height: 40,
                      backgroundColor: getStatusColor(booking.status),
                      color: 'white',
                      p: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      borderRadius: 0, // Square corners
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                        zIndex: 10
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    }}
                    onClick={() => handleBookingClick(booking)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.65rem'
                        }}
                      >
                        {getStatusIcon(booking.status)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        noWrap 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          flex: 1
                        }}
                      >
                        {booking.customerName}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <People fontSize="small" />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.6rem'
                          }}
                        >
                          {booking.partySize}
                        </Typography>
                      </Box>
                      <Chip
                        label={booking.status}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.55rem',
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          color: 'white',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          border: '1px solid rgba(255,255,255,0.3)'
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
        mt: 2, 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap',
        p: 2,
        border: '1px solid #334155', // slate-700
        backgroundColor: '#1e293b', // slate-800
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        borderRadius: 0 // Square corners
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: getStatusColor('confirmed'),
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 0 // Square corners
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#ffffff' // white headings
          }}>Confirmed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: getStatusColor('pending'),
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 0 // Square corners
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#ffffff' // white headings
          }}>Pending</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: getStatusColor('completed'),
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 0 // Square corners
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#ffffff' // white headings
          }}>Completed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: getStatusColor('cancelled'),
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 0 // Square corners
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#ffffff' // white headings
          }}>Cancelled</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: getStatusColor('no_show'),
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 0 // Square corners
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#ffffff' // white headings
          }}>No Show</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineView;