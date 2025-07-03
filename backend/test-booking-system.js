const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';

async function testBookingSystem() {
  console.log('🧪 Testing Optimized Booking System\n');

  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@restaurant.com',
      password: 'admin123'
    });
    authToken = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // 2. Get dietary requirements
    console.log('2. Fetching dietary requirements...');
    const dietaryResponse = await axios.get(`${API_URL}/dietary-requirements`);
    console.log(`✅ Found ${dietaryResponse.data.data.length} dietary requirements`);
    console.log('Sample:', dietaryResponse.data.data.slice(0, 3).map(d => d.name).join(', '), '\n');

    // 3. Search dietary requirements
    console.log('3. Searching for "nut" allergies...');
    const searchResponse = await axios.get(`${API_URL}/dietary-requirements/search?q=nut`);
    console.log(`✅ Found ${searchResponse.data.data.length} matches`);
    searchResponse.data.data.forEach(d => {
      console.log(`  - ${d.name} (${d.severity})`);
    });
    console.log();

    // 4. Get enhanced availability
    console.log('4. Checking enhanced availability...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const availabilityResponse = await axios.get(`${API_URL}/bookings/staff/availability`, {
      params: {
        restaurantId: '11111111-1111-1111-1111-111111111111',
        date: dateStr,
        partySize: 4,
        preferredTime: '19:00'
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const availability = availabilityResponse.data.data;
    console.log(`✅ Got availability for ${availability.date}`);
    console.log(`   Time slots with pacing status:`);
    availability.timeSlots.slice(0, 5).forEach(slot => {
      console.log(`   - ${slot.time}: ${slot.pacingStatus} (${slot.tablesAvailable} tables available)`);
    });
    console.log();

    // 5. Create a staff booking with all new fields
    console.log('5. Creating staff booking with dietary requirements...');
    const bookingData = {
      restaurantId: '11111111-1111-1111-1111-111111111111',
      customerName: 'John Smith',
      customerEmail: 'john.smith@example.com',
      customerPhone: '+1234567890',
      partySize: 4,
      bookingDate: dateStr,
      bookingTime: '19:00',
      duration: 120,
      dietaryRequirements: 'Gluten Free, Nut Allergy',
      occasion: 'Birthday',
      preferredSeating: 'Window table',
      specialRequests: 'Birthday cake with candles',
      isVip: false,
      internalNotes: 'Regular customer, always punctual',
      marketingConsent: true
    };

    const bookingResponse = await axios.post(
      `${API_URL}/bookings/staff`,
      bookingData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('✅ Booking created successfully!');
    console.log(`   Confirmation: ${bookingResponse.data.data.confirmationCode}`);
    console.log(`   Status: ${bookingResponse.data.data.status}`);
    console.log();

    // 6. Test customer auto-complete
    console.log('6. Testing customer auto-complete...');
    const customerResponse = await axios.get(
      `${API_URL}/bookings/staff/customers/11111111-1111-1111-1111-111111111111?search=john`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log(`✅ Found ${customerResponse.data.data.length} matching customers`);
    if (customerResponse.data.data.length > 0) {
      const customer = customerResponse.data.data[0];
      console.log(`   - ${customer.customerName} (${customer.customerPhone})`);
      console.log(`     Total bookings: ${customer.totalBookings}`);
      if (customer.dietaryRequirements) {
        console.log(`     Dietary: ${customer.dietaryRequirements}`);
      }
    }
    console.log();

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testBookingSystem();