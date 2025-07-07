const axios = require('axios');

async function testProductionBooking() {
  console.log('🧪 Testing Production Booking Creation');
  console.log('=' .repeat(45));

  const baseURL = 'https://kind-benevolence-production.up.railway.app/api';
  
  try {
    // Test 1: Check health
    console.log('📊 Checking production health...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('Health status:', healthResponse.data.data.status);
    console.log('Database schema valid:', healthResponse.data.data.database.schema.valid);
    console.log('Missing columns:', healthResponse.data.data.database.schema.missingColumns);
    
    // Test 2: Check availability
    console.log('\n📅 Checking availability...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const availabilityResponse = await axios.get(`${baseURL}/bookings/availability`, {
      params: {
        restaurantId: '1723b385-dc14-461f-a06a-119d2bc0ba5c',
        date: dateStr,
        partySize: 4
      }
    });
    
    console.log('Available slots found:', availabilityResponse.data.data.timeSlots?.length || 0);
    
    if (!availabilityResponse.data.data.timeSlots || availabilityResponse.data.data.timeSlots.length === 0) {
      throw new Error('No available slots found');
    }

    // Test 3: Try to create a booking with detailed error capture
    console.log('\n📝 Attempting booking creation...');
    const firstAvailableSlot = availabilityResponse.data.data.timeSlots[0];
    
    const bookingData = {
      restaurantId: '1723b385-dc14-461f-a06a-119d2bc0ba5c',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '5551234567',
      partySize: 4,
      bookingDate: dateStr,
      bookingTime: firstAvailableSlot.time,
      duration: 120,
      specialRequests: 'Production test booking'
    };
    
    console.log('Booking data:', JSON.stringify(bookingData, null, 2));
    
    try {
      const bookingResponse = await axios.post(`${baseURL}/bookings/guest`, bookingData);
      
      if (bookingResponse.data.success) {
        const booking = bookingResponse.data.data;
        console.log('✅ Booking created successfully!');
        console.log('Booking ID:', booking.id);
        console.log('Confirmation Code:', booking.confirmationCode);
        console.log('Status:', booking.status);
      }
    } catch (bookingError) {
      console.error('\n❌ BOOKING CREATION FAILED:');
      console.error('Status:', bookingError.response?.status);
      console.error('Status Text:', bookingError.response?.statusText);
      console.error('Response Headers:', bookingError.response?.headers);
      console.error('Response Data:', JSON.stringify(bookingError.response?.data, null, 2));
      console.error('Request URL:', bookingError.config?.url);
      console.error('Request Method:', bookingError.config?.method);
      console.error('Request Headers:', bookingError.config?.headers);
      
      // Additional error analysis
      if (bookingError.response?.data?.error) {
        console.error('\n🔍 Error Analysis:');
        console.error('Error Type:', typeof bookingError.response.data.error);
        console.error('Error Message:', bookingError.response.data.error);
        console.error('Error Stack:', bookingError.response.data.stack);
      }
      
      throw bookingError;
    }
    
  } catch (error) {
    console.error('\n❌ Production test failed:', error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the test
testProductionBooking()
  .then(() => {
    console.log('\n✅ Production booking system is working!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Production booking test failed:', error.message);
    process.exit(1);
  });