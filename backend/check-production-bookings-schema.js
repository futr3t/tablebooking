const axios = require('axios');

async function checkProductionBookingsSchema() {
  console.log('🔍 CHECKING: Production Bookings Table Schema');
  console.log('=' .repeat(50));

  try {
    // Create a detailed health check for production
    const healthCheck = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    console.log('📊 Testing production endpoints...');

    // Test 1: Basic health
    try {
      const healthResponse = await axios.get('https://kind-benevolence-production.up.railway.app/api/health');
      healthCheck.checks.basicHealth = {
        status: 'success',
        data: healthResponse.data.data
      };
      console.log('✅ Basic health check passed');
    } catch (error) {
      healthCheck.checks.basicHealth = {
        status: 'failed',
        error: error.response?.data || error.message
      };
      console.log('❌ Basic health check failed');
    }

    // Test 2: BookingLockService version
    try {
      const versionResponse = await axios.get('https://kind-benevolence-production.up.railway.app/api/debug/booking-lock-version');
      healthCheck.checks.lockServiceVersion = {
        status: 'success',
        data: versionResponse.data.data
      };
      console.log('✅ Lock service version check passed');
    } catch (error) {
      healthCheck.checks.lockServiceVersion = {
        status: 'failed',
        error: error.response?.data || error.message
      };
      console.log('❌ Lock service version check failed');
    }

    // Test 3: Error handling test
    try {
      const errorResponse = await axios.get('https://kind-benevolence-production.up.railway.app/api/debug/test-lock-error');
      healthCheck.checks.errorHandling = {
        status: 'success',
        data: errorResponse.data.data
      };
      console.log('✅ Error handling test passed');
    } catch (error) {
      healthCheck.checks.errorHandling = {
        status: 'failed',
        error: error.response?.data || error.message
      };
      console.log('❌ Error handling test failed');
    }

    // Test 4: Availability check
    try {
      const availabilityResponse = await axios.get('https://kind-benevolence-production.up.railway.app/api/bookings/availability', {
        params: {
          restaurantId: '1723b385-dc14-461f-a06a-119d2bc0ba5c',
          date: '2025-07-08',
          partySize: 4
        }
      });
      healthCheck.checks.availability = {
        status: 'success',
        data: {
          slotsFound: availabilityResponse.data.data.timeSlots?.length || 0,
          success: availabilityResponse.data.success
        }
      };
      console.log('✅ Availability check passed');
    } catch (error) {
      healthCheck.checks.availability = {
        status: 'failed',
        error: error.response?.data || error.message
      };
      console.log('❌ Availability check failed');
    }

    // Test 5: Booking creation (the failing one)
    try {
      const bookingResponse = await axios.post('https://kind-benevolence-production.up.railway.app/api/bookings/guest', {
        restaurantId: '1723b385-dc14-461f-a06a-119d2bc0ba5c',
        customerName: 'Schema Debug Test',
        customerEmail: 'schema@debug.com',
        customerPhone: '5551234567',
        partySize: 4,
        bookingDate: '2025-07-08',
        bookingTime: '17:00',
        duration: 120,
        specialRequests: 'Schema debug test'
      });
      healthCheck.checks.bookingCreation = {
        status: 'success',
        data: bookingResponse.data
      };
      console.log('✅ Booking creation passed!');
    } catch (error) {
      healthCheck.checks.bookingCreation = {
        status: 'failed',
        error: error.response?.data || error.message,
        statusCode: error.response?.status,
        details: {
          url: error.config?.url,
          method: error.config?.method
        }
      };
      console.log('❌ Booking creation failed');
    }

    console.log('\n📋 COMPREHENSIVE HEALTH CHECK RESULTS:');
    console.log(JSON.stringify(healthCheck, null, 2));

    // Summary
    const passedTests = Object.values(healthCheck.checks).filter(check => check.status === 'success').length;
    const totalTests = Object.keys(healthCheck.checks).length;
    
    console.log(`\n📊 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (healthCheck.checks.bookingCreation?.status === 'failed') {
      console.log('\n🔍 BOOKING CREATION FAILURE ANALYSIS:');
      console.log('Error:', healthCheck.checks.bookingCreation.error);
      console.log('Status Code:', healthCheck.checks.bookingCreation.statusCode);
    }

  } catch (error) {
    console.error('❌ Test script failed:', error.message);
  }
}

// Run the check
checkProductionBookingsSchema();