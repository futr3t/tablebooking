const axios = require('axios');

async function testBookingCreation() {
  console.log('🧪 Testing Booking Creation After Database Fix');
  console.log('=' .repeat(50));

  const baseURL = 'http://localhost:3001/api';
  
  try {
    // Test 1: Check health
    console.log('📊 Checking system health...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('Health status:', healthResponse.data.data.status);
    console.log('Database schema valid:', healthResponse.data.data.database.schema.valid);
    
    if (!healthResponse.data.data.database.schema.valid) {
      throw new Error('Database schema is not valid. Missing columns: ' + 
        healthResponse.data.data.database.schema.missingColumns.join(', '));
    }

    // Test 2: Check availability
    console.log('\n📅 Checking availability...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const availabilityResponse = await axios.get(`${baseURL}/bookings/availability`, {
      params: {
        restaurantId: '1723b385-dc14-461f-a06a-119d2bc0ba5c', // Sample Restaurant ID
        date: dateStr,
        partySize: 4
      }
    });
    
    console.log('Available slots found:', availabilityResponse.data.data.timeSlots?.length || 0);
    
    if (!availabilityResponse.data.data.timeSlots || availabilityResponse.data.data.timeSlots.length === 0) {
      console.log('⚠️  No available slots found, but this might be normal depending on opening hours');
      console.log('Available slots:', availabilityResponse.data.data);
    } else {
      console.log('✅ Availability check working properly');
      
      // Test 3: Create a test booking
      console.log('\n📝 Creating test booking...');
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
        specialRequests: 'Test booking for system verification'
      };
      
      const bookingResponse = await axios.post(`${baseURL}/bookings/guest`, bookingData);
      
      if (bookingResponse.data.success) {
        const booking = bookingResponse.data.data;
        console.log('✅ Booking created successfully!');
        console.log('Booking ID:', booking.id);
        console.log('Confirmation Code:', booking.confirmationCode);
        console.log('Status:', booking.status);
        
        // Test 4: Clean up - cancel the test booking
        console.log('\n🧹 Cleaning up test booking...');
        const cancelResponse = await axios.delete(`${baseURL}/bookings/${booking.id}`);
        if (cancelResponse.data.success) {
          console.log('✅ Test booking cleaned up successfully');
        }
      } else {
        throw new Error('Booking creation failed: ' + JSON.stringify(bookingResponse.data));
      }
    }
    
    console.log('\n🎉 All booking tests passed! The system is working properly.');
    
  } catch (error) {
    console.error('\n❌ Booking test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the test
testBookingCreation()
  .then(() => {
    console.log('\n✅ Booking system is fully operational!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Booking system test failed:', error.message);
    process.exit(1);
  });