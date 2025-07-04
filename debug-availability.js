const https = require('https');

// Test the availability API directly
const testAvailability = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
  // Get the login token first (use the deployed Railway backend)
  const loginData = JSON.stringify({
    email: 'admin@restaurant.com',
    password: 'admin123'
  });

  const loginOptions = {
    hostname: 'tablebooking-backend-production.up.railway.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  console.log('🔍 Testing availability API...');
  console.log('📅 Date:', date);
  console.log('👥 Party Size: 2');

  const loginReq = https.request(loginOptions, (loginRes) => {
    let loginBody = '';
    loginRes.on('data', (chunk) => loginBody += chunk);
    loginRes.on('end', () => {
      try {
        const loginResponse = JSON.parse(loginBody);
        if (loginResponse.success && loginResponse.data.token) {
          const token = loginResponse.data.token;
          const restaurantId = loginResponse.data.user.restaurantId;
          console.log('✅ Login successful');
          console.log('🏪 Restaurant ID:', restaurantId);
          
          // Now test the availability API
          const availabilityPath = `/api/bookings/staff/availability?restaurantId=${restaurantId}&date=${date}&partySize=2`;
          const availabilityOptions = {
            hostname: 'tablebooking-backend-production.up.railway.app',
            port: 443,
            path: availabilityPath,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };

          console.log('🔗 Calling:', availabilityPath);
          
          const availabilityReq = https.request(availabilityOptions, (availRes) => {
            let availBody = '';
            availRes.on('data', (chunk) => availBody += chunk);
            availRes.on('end', () => {
              console.log('📊 Status Code:', availRes.statusCode);
              console.log('📋 Response Headers:', availRes.headers);
              console.log('📄 Response Body:', availBody);
              
              try {
                const response = JSON.parse(availBody);
                if (response.success && response.data.timeSlots) {
                  console.log('✅ Success! Found', response.data.timeSlots.length, 'time slots');
                  console.log('🕐 Time slots:', response.data.timeSlots.map(slot => `${slot.time} (${slot.pacingStatus})`));
                } else {
                  console.log('❌ No time slots found or error');
                  console.log('📝 Full response:', JSON.stringify(response, null, 2));
                }
              } catch (error) {
                console.log('❌ JSON Parse Error:', error.message);
                console.log('📄 Raw response:', availBody);
              }
            });
          });

          availabilityReq.on('error', (error) => {
            console.log('❌ Availability API Error:', error.message);
          });

          availabilityReq.end();
        } else {
          console.log('❌ Login failed:', loginBody);
        }
      } catch (error) {
        console.log('❌ Login JSON Parse Error:', error.message);
        console.log('📄 Raw login response:', loginBody);
      }
    });
  });

  loginReq.on('error', (error) => {
    console.log('❌ Login Error:', error.message);
  });

  loginReq.write(loginData);
  loginReq.end();
};

testAvailability();