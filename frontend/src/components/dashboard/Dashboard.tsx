import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
      <Typography variant="h4" gutterBottom>
        Dashboard - {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Bookings Today
              </Typography>
              <Typography variant="h4">{stats.totalToday}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Guests
              </Typography>
              <Typography variant="h4">{stats.totalGuests}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Confirmed
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.confirmed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Today's Bookings Timeline
        </Typography>
        <TimelineView 
          bookings={bookings} 
          onBookingUpdate={handleBookingUpdate}
        />
      </Paper>
    </Box>
  );
};

export default Dashboard;