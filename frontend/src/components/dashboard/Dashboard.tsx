import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { format, parseISO, isToday } from 'date-fns';
import { bookingService } from '../../services/api';
import { Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import TimelineView from './TimelineView';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
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

  useEffect(() => {
    if (user?.restaurantId) {
      loadTodaysBookings();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBookingCreated = (booking: Booking) => {
      if (isToday(parseISO(booking.bookingTime))) {
        setBookings(prev => [...prev, booking]);
        updateStats([...bookings, booking]);
      }
    };

    const handleBookingUpdated = (booking: Booking) => {
      if (isToday(parseISO(booking.bookingTime))) {
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
      const data = await bookingService.getBookings(user.restaurantId, today);
      
      const todaysBookings = data.filter(booking => 
        isToday(parseISO(booking.bookingTime))
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
    setStats({
      totalToday: bookingsList.length,
      pending: bookingsList.filter(b => b.status === 'pending').length,
      confirmed: bookingsList.filter(b => b.status === 'confirmed').length,
      cancelled: bookingsList.filter(b => b.status === 'cancelled').length,
      totalGuests: bookingsList.reduce((sum, b) => sum + b.partySize, 0),
    });
  };

  const handleBookingUpdate = () => {
    loadTodaysBookings();
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: 'text.primary',
          mb: 0.5
        }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • Today's bookings and activity
        </Typography>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stats.totalToday}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Bookings Today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stats.totalGuests}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Guests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stats.confirmed}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Confirmed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Card sx={{ p: 0 }}>
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Today's Bookings Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
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
    </Box>
  );
};

export default Dashboard;