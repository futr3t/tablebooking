const { AvailabilityService } = require('./src/services/availability.ts');

async function testAvailability() {
  console.log('Testing availability service...');
  
  try {
    const restaurantId = '1723b385-dc14-461f-a06a-119d2bc0ba5c';
    const date = '2025-07-05';
    const partySize = 2;
    
    console.log(`Checking availability for:
- Restaurant: ${restaurantId}
- Date: ${date}
- Party Size: ${partySize}`);
    
    const availability = await AvailabilityService.checkAvailability(
      restaurantId,
      date,
      partySize
    );
    
    console.log('Result:', JSON.stringify(availability, null, 2));
  } catch (error) {
    console.error('Error testing availability:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Add timeout to prevent infinite hangs
const timeout = setTimeout(() => {
  console.error('Test timed out after 10 seconds');
  process.exit(1);
}, 10000);

testAvailability().then(() => {
  clearTimeout(timeout);
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  clearTimeout(timeout);
  console.error('Test failed:', error);
  process.exit(1);
});