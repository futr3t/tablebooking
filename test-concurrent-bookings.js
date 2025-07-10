#!/usr/bin/env node

/**
 * Test script for concurrent booking limits
 * Tests the fixes implemented for preventing double bookings and ensuring proper availability checks
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const TEST_RESTAURANT_ID = process.env.TEST_RESTAURANT_ID || '123e4567-e89b-12d3-a456-426614174000';

// Test data
const testBooking = {
  restaurantId: TEST_RESTAURANT_ID,
  customerName: 'Test Customer',
  customerPhone: '+1234567890',
  customerEmail: 'test@example.com',
  partySize: 4,
  bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
  bookingTime: '19:00', // 7 PM
  duration: 120,
  notes: 'Test booking for concurrent limits testing',
  source: 'staff'
};

let authToken = null;

async function authenticate() {
  try {
    console.log('🔐 Authenticating with test admin account...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@restaurant.com',
      password: 'admin123'
    });
    
    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkAvailability() {
  try {
    console.log('\\n📊 Checking availability for test time slot...');
    
    const response = await axios.get(`${API_BASE}/bookings/staff/availability`, {
      params: {
        restaurantId: TEST_RESTAURANT_ID,
        date: testBooking.bookingDate,
        partySize: testBooking.partySize
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const availability = response.data.data;
    const requestedSlot = availability.timeSlots.find(slot => slot.time === testBooking.bookingTime);
    
    if (!requestedSlot) {
      console.log('❌ Test time slot not available in service hours');
      return false;
    }
    
    console.log(`✅ Slot ${testBooking.bookingTime} status: ${requestedSlot.pacingStatus}`);
    console.log(`   Tables available: ${requestedSlot.tablesAvailable}`);
    console.log(`   Can override: ${requestedSlot.canOverride}`);
    
    return requestedSlot;
  } catch (error) {
    console.error('❌ Failed to check availability:', error.response?.data || error.message);
    return false;
  }
}

async function createBooking(customerName = 'Test Customer', override = false) {
  try {
    console.log(`\\n📝 Creating booking for ${customerName}...`);
    
    const bookingData = {
      ...testBooking,
      customerName,
      overridePacing: override,
      overrideReason: override ? 'Testing concurrent booking limits' : undefined
    };
    
    const response = await axios.post(`${API_BASE}/bookings/staff`, bookingData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const booking = response.data.data;
    console.log(`✅ Booking created successfully: ${booking.id}`);
    console.log(`   Customer: ${booking.customerName}`);
    console.log(`   Table: ${booking.tableId || 'Waitlisted'}`);
    console.log(`   Status: ${booking.status}`);
    
    return booking;
  } catch (error) {
    console.log(`❌ Booking creation failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testConcurrentBookings() {
  console.log('\\n🧪 Testing concurrent booking scenarios...');
  
  // Test 1: Create multiple bookings for the same time slot
  console.log('\\n--- Test 1: Multiple bookings for same time slot ---');
  
  const booking1 = await createBooking('Customer 1');
  const booking2 = await createBooking('Customer 2');
  const booking3 = await createBooking('Customer 3');
  
  // Test 2: Check availability after bookings
  console.log('\\n--- Test 2: Availability after bookings ---');
  const updatedSlot = await checkAvailability();
  
  // Test 3: Try booking with override
  if (updatedSlot && (updatedSlot.pacingStatus === 'pacing_full' || updatedSlot.pacingStatus === 'full')) {
    console.log('\\n--- Test 3: Booking with override ---');
    const overrideBooking = await createBooking('Override Customer', true);
  }
  
  // Test 4: Try booking when physically full
  if (updatedSlot && updatedSlot.pacingStatus === 'physically_full') {
    console.log('\\n--- Test 4: Booking when physically full ---');
    const failedBooking = await createBooking('Impossible Customer', true);
  }
  
  console.log('\\n✅ Concurrent booking tests completed!');
}

async function runTests() {
  console.log('🚀 Starting concurrent booking limits test suite');
  console.log(`📅 Test date: ${testBooking.bookingDate}`);
  console.log(`🕐 Test time: ${testBooking.bookingTime}`);
  console.log(`👥 Party size: ${testBooking.partySize}`);
  
  if (!(await authenticate())) {
    process.exit(1);
  }
  
  const initialSlot = await checkAvailability();
  if (!initialSlot) {
    console.log('❌ Cannot run tests - time slot not available');
    process.exit(1);
  }
  
  await testConcurrentBookings();
  
  console.log('\\n🎉 All tests completed! Check the results above.');
  console.log('\\n💡 Expected behaviors:');
  console.log('   - First booking should succeed');
  console.log('   - Subsequent bookings should either succeed, require override, or fail based on availability');
  console.log('   - Physically full slots should reject all bookings');
  console.log('   - Pacing limits should allow override with reason');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});