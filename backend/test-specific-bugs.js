#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_EMAIL = 'admin@restaurant.com';
const TEST_PASSWORD = 'admin123';

async function testSpecificBugs() {
  console.log('🐛 TESTING SPECIFIC FRONTEND BUGS');
  console.log('=================================\n');

  try {
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    const restaurantId = user.restaurantId;
    
    const apiConfig = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`Using restaurant ID: ${restaurantId}\n`);

    // Bug Test 1: parseInt(NaN) issue
    console.log('🔍 Bug Test 1: parseInt() NaN handling');
    console.log('---------------------------------------------');
    try {
      const nanUpdate = {
        turnTimeMinutes: parseInt(''), // This becomes NaN
        defaultSlotDuration: parseInt(''), // This becomes NaN
      };
      
      console.log('Sending NaN values:', nanUpdate);
      const nanResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        nanUpdate, apiConfig);
      console.log('❌ NaN values were accepted (BUG!)');
    } catch (err) {
      console.log('✅ NaN values rejected (correct behavior)');
      console.log('Error:', err.response?.data?.message);
    }

    // Bug Test 2: Empty string to undefined conversion
    console.log('\n🔍 Bug Test 2: Empty string handling in optional fields');
    console.log('--------------------------------------------------------');
    try {
      const emptyStringUpdate = {
        maxCovers: '', // Empty string should become undefined
        bookingSettings: {
          maxConcurrentTables: '', // Empty string should become undefined
          maxConcurrentCovers: '' // Empty string should become undefined
        }
      };
      
      console.log('Sending empty strings:', emptyStringUpdate);
      const emptyResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        emptyStringUpdate, apiConfig);
      console.log('✅ Empty strings handled correctly');
    } catch (err) {
      console.log('❌ Empty strings caused error:', err.response?.data?.message);
    }

    // Bug Test 3: Required field validation bypass
    console.log('\n🔍 Bug Test 3: Required field validation');
    console.log('------------------------------------------');
    try {
      const requiredFieldUpdate = {
        turnTimeMinutes: null, // Required field set to null
        defaultSlotDuration: undefined, // Required field set to undefined
      };
      
      console.log('Sending null/undefined for required fields:', requiredFieldUpdate);
      const requiredResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        requiredFieldUpdate, apiConfig);
      console.log('❌ Null/undefined values accepted for required fields (BUG!)');
    } catch (err) {
      console.log('✅ Null/undefined values rejected for required fields (correct)');
      console.log('Error:', err.response?.data?.message);
    }

    // Bug Test 4: JSON nested object validation
    console.log('\n🔍 Bug Test 4: Nested bookingSettings validation');
    console.log('--------------------------------------------------');
    try {
      const nestedUpdate = {
        bookingSettings: {
          maxPartySize: -1, // Invalid negative value
          slotDuration: 0, // Invalid zero value
          reminderHours: 100 // Invalid too large value
        }
      };
      
      console.log('Sending invalid nested values:', nestedUpdate);
      const nestedResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        nestedUpdate, apiConfig);
      console.log('❌ Invalid nested values accepted (BUG!)');
    } catch (err) {
      console.log('✅ Invalid nested values rejected (correct)');
      console.log('Error:', err.response?.data?.message);
    }

    // Bug Test 5: OpeningHours malformed data
    console.log('\n🔍 Bug Test 5: OpeningHours validation');
    console.log('---------------------------------------');
    try {
      const malformedHours = {
        openingHours: {
          monday: {
            isOpen: true,
            periods: [
              {
                name: '',
                startTime: '25:00', // Invalid time
                endTime: '22:00'
              }
            ]
          }
        }
      };
      
      console.log('Sending malformed opening hours:', malformedHours);
      const hoursResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        malformedHours, apiConfig);
      console.log('❌ Malformed opening hours accepted (BUG!)');
    } catch (err) {
      console.log('✅ Malformed opening hours rejected (correct)');
      console.log('Error:', err.response?.data?.message);
    }

    // Bug Test 6: Data type coercion issues
    console.log('\n🔍 Bug Test 6: Data type coercion');
    console.log('----------------------------------');
    try {
      const coercionUpdate = {
        turnTimeMinutes: '120', // String instead of number
        maxCovers: '50', // String instead of number
        bookingSettings: {
          maxPartySize: '12', // String instead of number
          enableWaitlist: 'true' // String instead of boolean
        }
      };
      
      console.log('Sending strings for number/boolean fields:', coercionUpdate);
      const coercionResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        coercionUpdate, apiConfig);
      console.log('✅ Type coercion handled correctly (might be intentional)');
      
      // Verify the data was stored correctly
      const verifyResponse = await axios.get(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, apiConfig);
      const settings = verifyResponse.data.data;
      console.log('Stored values:', {
        turnTimeMinutes: settings.turnTimeMinutes,
        maxCovers: settings.maxCovers,
        maxPartySize: settings.bookingSettings.maxPartySize,
        enableWaitlist: settings.bookingSettings.enableWaitlist
      });
      
    } catch (err) {
      console.log('❌ Type coercion failed:', err.response?.data?.message);
    }

    console.log('\n🎉 Bug testing complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSpecificBugs();