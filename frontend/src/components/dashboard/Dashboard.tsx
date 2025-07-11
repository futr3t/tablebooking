import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Fab,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { bookingService, restaurantService } from '../../services/api';
import { Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useDateFormat } from '../../contexts/DateFormatContext';
import { isBookingToday } from '../../utils/dateHelpers';
import { useSocket } from '../../hooks/useSocket';
import TimelineView from './TimelineView';
import { QuickBookingDialog } from '../bookings/QuickBookingDialog';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const { formatDate, restaurantSettings } = useDateFormat();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalToday: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    totalGuests: 0,
  });
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);

  useEffect(() => {
    if (user?.restaurantId) {
      loadTodaysBookings();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBookingCreated = (booking: Booking) => {
      if (isBookingToday(booking)) {
        setBookings(prev => [...prev, booking]);
        updateStats([...bookings, booking]);
      }
    };

    const handleBookingUpdated = (booking: Booking) => {
      if (isBookingToday(booking)) {
        setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
        updateStats(bookings.map(b => b.id === booking.id ? booking : b));
      }
    };

    const handleBookingCancelled = (bookingId: string) => {
      setBookings(prev => {
        const updated = prev.map(b => 
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        );
        updateStats(updated);
        return updated;
      });
    };

    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:updated', handleBookingUpdated);
    socket.on('booking:cancelled', handleBookingCancelled);

    return () => {
      socket.off('booking:created', handleBookingCreated);
      socket.off('booking:updated', handleBookingUpdated);
      socket.off('booking:cancelled', handleBookingCancelled);
    };
  }, [socket, bookings]);

  const loadTodaysBookings = async () => {
    if (!user?.restaurantId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Get all bookings including cancelled to show proper stats
      const data = await bookingService.getBookings(user.restaurantId, today, true);
      
      const todaysBookings = data.filter(booking => 
        isBookingToday(booking)
      );
      
      setBookings(todaysBookings);
      updateStats(todaysBookings);
    } catch (err: any) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (bookingsList: Booking[]) => {
    const activeBookings = bookingsList.filter(b => b.status !== 'cancelled' && b.status !== 'no_show');
    setStats({
      totalToday: bookingsList.length,
      pending: bookingsList.filter(b => b.status === 'pending').length,
      confirmed: bookingsList.filter(b => b.status === 'confirmed').length,
      cancelled: bookingsList.filter(b => b.status === 'cancelled').length,
      totalGuests: activeBookings.reduce((sum, b) => sum + b.partySize, 0),
    });
  };


  const handleBookingUpdate = () => {
    loadTodaysBookings();
  };

  const handleQuickBookingSuccess = (booking: Booking) => {
    if (isBookingToday(booking)) {
      setBookings(prev => [...prev, booking]);
      updateStats([...bookings, booking]);
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: 'white',
            mb: 0.5
          }}>
            Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgb(203, 213, 225)' }}>
            {formatDate(new Date(), 'long')} • Today's bookings and activity
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setQuickBookingOpen(true)}
          sx={{
            background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)',
            borderRadius: 0,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            '&:hover': {
              background: 'linear-gradient(to bottom right, #1d4ed8, #1e40af)',
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Quick Booking
        </Button>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderColor: '#334155',
            borderRadius: 0,
            color: 'white',
            '& .MuiAlert-icon': {
              color: '#ef4444'
            }
          }}
        >
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: 0,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                    {stats.totalToday}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Total Bookings Today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(to bottom right, #059669, #047857)',
            color: 'white',
            border: 'none',
            borderRadius: 0,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                    {stats.totalGuests}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Total Guests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={restaurantSettings?.bookingSettings?.autoConfirm ? 4 : 3}>
          <Card sx={{ 
            background: 'linear-gradient(to bottom right, #0891b2, #0e7490)',
            color: 'white',
            border: 'none',
            borderRadius: 0,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                    {stats.confirmed}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Confirmed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {!restaurantSettings?.bookingSettings?.autoConfirm && (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(to bottom right, #ea580c, #c2410c)',
              color: 'white',
              border: 'none',
              borderRadius: 0,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }
            }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                      {stats.pending}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      Pending
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      
      <Card sx={{ 
        p: 0,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderColor: '#334155',
        borderRadius: 0,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid #334155',
          backgroundColor: 'rgba(30, 41, 59, 0.3)'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'white' }}>
            Today's Bookings Timeline
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgb(203, 213, 225)' }}>
            Real-time view of all bookings scheduled for today
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <TimelineView 
            bookings={bookings} 
            onBookingUpdate={handleBookingUpdate}
          />
        </Box>
      </Card>

      {/* Quick Booking Dialog */}
      {user?.restaurantId && (
        <QuickBookingDialog
          open={quickBookingOpen}
          onClose={() => setQuickBookingOpen(false)}
          restaurantId={user.restaurantId}
          onSuccess={handleQuickBookingSuccess}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'block', md: 'none' }
        }}
      >
        <Fab
          color="primary"
          onClick={() => setQuickBookingOpen(true)}
          sx={{
            background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)',
            borderRadius: 0,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            '&:hover': {
              background: 'linear-gradient(to bottom right, #1d4ed8, #1e40af)',
              transform: 'translateY(-2px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <AddIcon />
        </Fab>
      </Box>
    </Box>
  );
};

export default Dashboard;