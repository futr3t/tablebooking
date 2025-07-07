const axios = require('axios');

async function testSettingsUpdate() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@restaurant.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    console.log('Logged in as:', user.email);
    console.log('Restaurant ID:', user.restaurantId);
    
    // Test updating settings
    const testSettings = {
      name: 'Test Restaurant',
      turnTimeMinutes: 120,
      defaultSlotDuration: 30,
      openingHours: {
        monday: { isOpen: false, periods: [] },
        tuesday: { isOpen: true, periods: [{ name: 'Service', startTime: '17:00', endTime: '21:00' }] }
      },
      bookingSettings: {
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 2,
        maxPartySize: 12,
        slotDuration: 30,
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
    
    console.log('\nSending settings update...');
    console.log('Settings keys:', Object.keys(testSettings));
    
    const updateResponse = await axios.put(
      `http://localhost:3001/api/restaurants/${user.restaurantId}/settings`,
      testSettings,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\nUpdate successful!');
    console.log('Response:', updateResponse.data);
    
  } catch (error) {
    console.error('\nError occurred:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

console.log('Testing restaurant settings update...\n');
testSettingsUpdate();