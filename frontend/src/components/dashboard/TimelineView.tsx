import React from 'react';
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

interface TimelineViewProps {
  bookings: Booking[];
  onBookingUpdate: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ bookings, onBookingUpdate }) => {
  const theme = useTheme();

  const startHour = 12;
  const endHour = 22;
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
      case 'confirmed': return theme.palette.success.main;
      case 'pending': return theme.palette.warning.main;
      case 'cancelled': return theme.palette.error.main;
      case 'completed': return theme.palette.info.main;
      case 'no_show': return theme.palette.grey[500];
      default: return theme.palette.grey[400];
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
    <Box sx={{ position: 'relative', mt: 2 }}>
      <Box sx={{ display: 'flex', mb: 4 }}>
        {timeSlots.map((time, index) => (
          <Box
            key={time}
            sx={{
              flex: 1,
              textAlign: 'center',
              borderLeft: index === 0 ? 'none' : '1px solid #e0e0e0',
              position: 'relative',
            }}
          >
            <Typography variant="caption" color="textSecondary">
              {time}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ position: 'relative', minHeight: 200 }}>
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
                height: 60,
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: -80,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 70,
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
                    elevation={2}
                    sx={{
                      position: 'absolute',
                      left: `${position}%`,
                      width: `${width}%`,
                      height: 50,
                      backgroundColor: getStatusColor(booking.status),
                      color: 'white',
                      p: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      '&:hover': {
                        opacity: 0.9,
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      // Handle booking click - could open edit dialog
                    }}
                  >
                    <Typography variant="caption" noWrap fontWeight="bold">
                      {booking.customerName}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <People fontSize="small" />
                      <Typography variant="caption">
                        {booking.partySize}
                      </Typography>
                      <Chip
                        label={booking.status}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.65rem',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          color: 'white',
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

      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: theme.palette.success.main,
              borderRadius: 1,
            }}
          />
          <Typography variant="caption">Confirmed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: theme.palette.warning.main,
              borderRadius: 1,
            }}
          />
          <Typography variant="caption">Pending</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: theme.palette.info.main,
              borderRadius: 1,
            }}
          />
          <Typography variant="caption">Completed</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: theme.palette.error.main,
              borderRadius: 1,
            }}
          />
          <Typography variant="caption">Cancelled</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineView;