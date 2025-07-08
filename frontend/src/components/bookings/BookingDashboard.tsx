import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Today,
  ChevronLeft,
  ChevronRight,
  ViewTimeline,
  FormatListBulleted,
  Add,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { bookingService, tableService } from '../../services/api';
import { Booking, Table } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useDateFormat } from '../../contexts/DateFormatContext';
import { QuickBookingDialog } from './QuickBookingDialog';
import BookingDayView from './BookingDayView';
import BookingTimelineView from './BookingTimelineView';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`booking-tabpanel-${index}`}
      aria-labelledby={`booking-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const BookingDashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { formatDate, restaurantSettings } = useDateFormat();
  
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTab, setCurrentTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);

  // Load bookings for selected date
  useEffect(() => {
    if (user?.restaurantId) {
      loadBookingsForDate(selectedDate);
    }
  }, [selectedDate, user]);

  // Load tables once
  useEffect(() => {
    if (user?.restaurantId) {
      loadTables();
    }
  }, [user]);

  const loadBookingsForDate = async (date: Date) => {
    if (!user?.restaurantId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await bookingService.getBookings(user.restaurantId, dateStr);
      
      // Filter bookings to only show those for the selected date
      const dayBookings = data.filter(booking => {
        if (!booking.bookingDate) return false;
        const bookingDate = new Date(booking.bookingDate.split('T')[0]);
        return isSameDay(bookingDate, date);
      });
      
      setBookings(dayBookings);
    } catch (err: any) {
      setError('Failed to load bookings');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!user?.restaurantId) return;
    
    try {
      const data = await tableService.getTables(user.restaurantId);
      setTables(data.tables || []);
    } catch (err) {
      console.error('Error loading tables:', err);
    }
  };


  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(newDate);
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleBookingSuccess = (booking: Booking) => {
    // Refresh bookings if the new booking is for the selected date
    if (booking.bookingDate) {
      const bookingDate = new Date(booking.bookingDate.split('T')[0]);
      if (isSameDay(bookingDate, selectedDate)) {
        loadBookingsForDate(selectedDate);
      }
    }
  };

  const isToday = isSameDay(selectedDate, new Date());
  const bookingCount = bookings.length;

  return (
      <Box>
        {/* Header */}
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: 'text.primary',
              mb: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}>
              Booking Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage reservations with calendar view and timeline visualization
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setQuickBookingOpen(true)}
            fullWidth={isMobile}
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              },
              alignSelf: { xs: 'stretch', sm: 'flex-start' }
            }}
          >
            New Booking
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Calendar Navigation */}
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap'
          }}>
            {/* Date Picker */}
            <Box sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Select Date
              </Typography>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    placeholder: 'dd/MM/yyyy',
                    sx: { 
                      width: '100%',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        minHeight: '32px',
                        backgroundColor: '#334155',
                        borderRadius: 0,
                      },
                      '& .MuiInputBase-input': {
                        padding: '6px 8px',
                        lineHeight: '20px',
                        height: '20px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#475569',
                      },
                      '& .MuiInputLabel-root': {
                        display: 'none', // Hide the floating label completely
                      }
                    }
                  }
                }}
              />
            </Box>

            {/* Navigation Arrows */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <IconButton onClick={handlePreviousDay} size="small">
                <ChevronLeft />
              </IconButton>
              
              <Button
                variant={isToday ? "contained" : "outlined"}
                size="small"
                startIcon={<Today />}
                onClick={handleTodayClick}
                sx={isToday ? {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                  }
                } : undefined}
              >
                Today
              </Button>
              
              <IconButton onClick={handleNextDay} size="small">
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Selected Date Display */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              ml: { xs: 0, sm: 'auto' },
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' }
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                {formatDate(selectedDate, isMobile ? 'display' : 'long')}
              </Typography>
              <Chip 
                label={`${bookingCount} booking${bookingCount !== 1 ? 's' : ''}`}
                color={bookingCount > 0 ? 'primary' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Paper>

        {/* View Tabs */}
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            aria-label="booking view tabs"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem'
              }
            }}
          >
            <Tab 
              icon={<FormatListBulleted />} 
              label="Day View" 
              id="booking-tab-0"
              aria-controls="booking-tabpanel-0"
              iconPosition="start"
            />
            <Tab 
              icon={<ViewTimeline />} 
              label="Timeline View" 
              id="booking-tab-1"
              aria-controls="booking-tabpanel-1"
              iconPosition="start"
            />
          </Tabs>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TabPanel value={currentTab} index={0}>
                <BookingDayView 
                  bookings={bookings}
                  selectedDate={selectedDate}
                  onBookingUpdate={() => loadBookingsForDate(selectedDate)}
                />
              </TabPanel>
              
              <TabPanel value={currentTab} index={1}>
                <BookingTimelineView 
                  bookings={bookings}
                  tables={tables}
                  selectedDate={selectedDate}
                  onBookingUpdate={() => loadBookingsForDate(selectedDate)}
                />
              </TabPanel>
            </>
          )}
        </Paper>

        {/* Quick Booking Dialog */}
        {user?.restaurantId && (
          <QuickBookingDialog
            open={quickBookingOpen}
            onClose={() => setQuickBookingOpen(false)}
            restaurantId={user.restaurantId}
            onSuccess={handleBookingSuccess}
          />
        )}
      </Box>
  );
};

export default BookingDashboard;