#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_RESTAURANT_ID = 'your-restaurant-id'; // Will be replaced with actual ID
const TEST_EMAIL = 'admin@restaurant.com';
const TEST_PASSWORD = 'admin123';

async function testSettingsUpdate() {
  console.log('🔍 COMPREHENSIVE SETTINGS UPDATE AUDIT');
  console.log('=====================================\n');

  try {
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    const restaurantId = user.restaurantId;
    
    console.log(`✅ Login successful. Restaurant ID: ${restaurantId}`);
    
    const apiConfig = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // 2. Get current settings
    console.log('\n2. Getting current settings...');
    const currentResponse = await axios.get(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, apiConfig);
    const currentSettings = currentResponse.data.data;
    
    console.log('✅ Current settings retrieved');
    console.log('Current settings structure:');
    console.log(JSON.stringify(currentSettings, null, 2));

    // 3. Test various update scenarios
    console.log('\n3. Testing update scenarios...');
    
    // Test 1: Simple field update
    console.log('\n3.1 Testing simple field update (name)...');
    try {
      const simpleUpdate = {
        name: 'Updated Test Restaurant'
      };
      
      const simpleResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        simpleUpdate, apiConfig);
      console.log('✅ Simple update successful');
    } catch (err) {
      console.log('❌ Simple update failed:', err.response?.data || err.message);
    }

    // Test 2: JSON field update (openingHours)
    console.log('\n3.2 Testing JSON field update (openingHours)...');
    try {
      const jsonUpdate = {
        openingHours: {
          monday: { isOpen: false, periods: [] },
          tuesday: { isOpen: true, periods: [{ name: 'Dinner', startTime: '17:00', endTime: '21:00' }] },
          wednesday: { isOpen: true, periods: [{ name: 'Dinner', startTime: '17:00', endTime: '21:00' }] },
          thursday: { isOpen: true, periods: [{ name: 'Dinner', startTime: '17:00', endTime: '21:00' }] },
          friday: { isOpen: true, periods: [{ name: 'Dinner', startTime: '17:00', endTime: '21:00' }] },
          saturday: { isOpen: true, periods: [{ name: 'Dinner', startTime: '17:00', endTime: '21:00' }] },
          sunday: { isOpen: true, periods: [{ name: 'Lunch', startTime: '12:00', endTime: '14:00' }] }
        }
      };
      
      const jsonResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        jsonUpdate, apiConfig);
      console.log('✅ JSON update successful');
    } catch (err) {
      console.log('❌ JSON update failed:', err.response?.data || err.message);
    }

    // Test 3: Nested booking settings update
    console.log('\n3.3 Testing nested booking settings update...');
    try {
      const nestedUpdate = {
        bookingSettings: {
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 2,
          maxPartySize: 12,
          slotDuration: 30,
          maxConcurrentTables: 5,
          maxConcurrentCovers: 50,
          enableWaitlist: true,
          requirePhone: false,
          requireEmail: false,
          autoConfirm: true,
          sendConfirmationEmail: false,
          sendConfirmationSMS: false,
          sendReminderEmail: false,
          sendReminderSMS: false,
          reminderHours: 2
        }
      };
      
      const nestedResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        nestedUpdate, apiConfig);
      console.log('✅ Nested update successful');
    } catch (err) {
      console.log('❌ Nested update failed:', err.response?.data || err.message);
    }

    // Test 4: Full settings update (like frontend sends)
    console.log('\n3.4 Testing full settings update...');
    try {
      const fullUpdate = {
        name: currentSettings.name,
        email: currentSettings.email,
        phone: currentSettings.phone,
        address: currentSettings.address,
        cuisine: currentSettings.cuisine,
        description: currentSettings.description,
        maxCovers: currentSettings.maxCovers,
        timeZone: currentSettings.timeZone,
        turnTimeMinutes: currentSettings.turnTimeMinutes,
        defaultSlotDuration: currentSettings.defaultSlotDuration,
        openingHours: currentSettings.openingHours,
        bookingSettings: currentSettings.bookingSettings
      };
      
      const fullResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        fullUpdate, apiConfig);
      console.log('✅ Full update successful');
    } catch (err) {
      console.log('❌ Full update failed:', err.response?.data || err.message);
      console.log('Full error response:', err.response?.data);
    }

    // Test 5: Data type validation
    console.log('\n3.5 Testing data type validation...');
    try {
      const invalidUpdate = {
        turnTimeMinutes: "not_a_number", // Should be number
        maxCovers: -5, // Should be positive
        bookingSettings: {
          maxPartySize: "invalid" // Should be number
        }
      };
      
      const invalidResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        invalidUpdate, apiConfig);
      console.log('⚠️  Invalid data accepted (this might be a bug)');
    } catch (err) {
      console.log('✅ Invalid data rejected (expected behavior)');
      console.log('Validation error:', err.response?.data?.message || err.message);
    }

    // Test 6: Check for field mapping issues
    console.log('\n3.6 Testing field mapping...');
    try {
      const mappingUpdate = {
        maxCovers: 100,
        turnTimeMinutes: 150,
        defaultSlotDuration: 45,
        timeZone: 'America/New_York'
      };
      
      const mappingResponse = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        mappingUpdate, apiConfig);
      console.log('✅ Field mapping successful');
    } catch (err) {
      console.log('❌ Field mapping failed:', err.response?.data || err.message);
    }

    // Test 7: Check for concurrency issues
    console.log('\n3.7 Testing concurrent updates...');
    try {
      const update1 = axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        { name: 'Concurrent Test 1' }, apiConfig);
      const update2 = axios.put(`${API_BASE_URL}/restaurants/${restaurantId}/settings`, 
        { name: 'Concurrent Test 2' }, apiConfig);
      
      await Promise.all([update1, update2]);
      console.log('✅ Concurrent updates successful');
    } catch (err) {
      console.log('❌ Concurrent updates failed:', err.response?.data || err.message);
    }

    console.log('\n🎉 Audit complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testSettingsUpdate();