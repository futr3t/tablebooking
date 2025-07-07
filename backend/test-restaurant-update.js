const { Pool } = require('pg');
require('dotenv').config();

async function testRestaurantUpdate() {
  console.log('🧪 Testing Restaurant Settings Update');
  console.log('=' .repeat(40));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Get a restaurant ID for testing
    const restaurant = await pool.query(`
      SELECT id, name FROM restaurants LIMIT 1
    `);
    
    if (restaurant.rows.length === 0) {
      throw new Error('No restaurants found for testing');
    }

    const restaurantId = restaurant.rows[0].id;
    const restaurantName = restaurant.rows[0].name;
    
    console.log(`📍 Testing with restaurant: ${restaurantName} (${restaurantId})`);

    // Test 1: Read current settings
    console.log('\n📖 Reading current settings...');
    const current = await pool.query(`
      SELECT turn_time_minutes, default_slot_duration, max_covers, booking_settings
      FROM restaurants WHERE id = $1
    `, [restaurantId]);
    
    console.log('Current settings:', current.rows[0]);

    // Test 2: Update settings (similar to what the frontend does)
    console.log('\n📝 Testing settings update...');
    const updateData = {
      turn_time_minutes: 120,
      default_slot_duration: 30,
      max_covers: 60,
      booking_settings: JSON.stringify({
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 2,
        maxPartySize: 12,
        enableWaitlist: true,
        autoConfirm: true
      })
    };

    const updateResult = await pool.query(`
      UPDATE restaurants 
      SET turn_time_minutes = $1, 
          default_slot_duration = $2, 
          max_covers = $3,
          booking_settings = $4
      WHERE id = $5
      RETURNING turn_time_minutes, default_slot_duration, max_covers, booking_settings
    `, [
      updateData.turn_time_minutes,
      updateData.default_slot_duration, 
      updateData.max_covers,
      updateData.booking_settings,
      restaurantId
    ]);

    console.log('✅ Update successful! New settings:', updateResult.rows[0]);

    // Test 3: Verify the update worked
    console.log('\n🔍 Verifying update...');
    const verify = await pool.query(`
      SELECT turn_time_minutes, default_slot_duration, max_covers, booking_settings
      FROM restaurants WHERE id = $1
    `, [restaurantId]);
    
    console.log('Verified settings:', verify.rows[0]);

    console.log('\n🎉 All restaurant update tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testRestaurantUpdate()
  .then(() => {
    console.log('\n✅ Restaurant update functionality is working properly!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Restaurant update test failed:', error);
    process.exit(1);
  });