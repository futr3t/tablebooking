const axios = require('axios');

// Test updating restaurant settings
async function testSettingsUpdate() {
  try {
    // First login as admin
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@restaurant.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    console.log('Logged in as:', user.email);
    console.log('Restaurant ID:', user.restaurantId);
    
    // Test update settings
    const updateData = {
      turnTimeMinutes: 120,
      defaultSlotDuration: 30,
      maxCovers: 100,
      bookingSettings: {
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 2,
        maxPartySize: 12,
        slotDuration: 30,
        maxConcurrentTables: 5,
        maxConcurrentCovers: 20,
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
    
    console.log('\nUpdating settings with:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await axios.put(
      `http://localhost:3001/api/restaurants/${user.restaurantId}/settings`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\nUpdate successful!');
    console.log('Response:', JSON.stringify(updateResponse.data, null, 2));
    
  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
  }
}

testSettingsUpdate();