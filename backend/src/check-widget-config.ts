import { db } from './config/database';

async function checkWidgetConfig() {
  try {
    console.log('=== Widget Config Diagnostic ===');
    
    // Check if widget_configs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'widget_configs'
      );
    `);
    
    console.log('Widget configs table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('ERROR: widget_configs table does not exist!');
      return;
    }
    
    // List all widget configs
    const configs = await db.query(`
      SELECT 
        wc.id,
        wc.api_key,
        wc.is_enabled,
        r.name as restaurant_name,
        r.is_active as restaurant_active
      FROM widget_configs wc
      LEFT JOIN restaurants r ON r.id = wc.restaurant_id
      ORDER BY wc.created_at DESC
    `);
    
    console.log('\nTotal widget configs:', configs.rowCount);
    
    configs.rows.forEach((config, index) => {
      console.log(`\nConfig ${index + 1}:`);
      console.log('  Restaurant:', config.restaurant_name);
      console.log('  API Key:', config.api_key);
      console.log('  Widget Enabled:', config.is_enabled);
      console.log('  Restaurant Active:', config.restaurant_active);
    });
    
    // Test specific API key
    const testApiKey = 'B946B3EC9EDBB544FD29A3AAD280E78F218E20853D5C341EFC90C0AB1358B392';
    const testResult = await db.query(
      'SELECT * FROM widget_configs WHERE api_key = $1',
      [testApiKey]
    );
    
    console.log('\n=== Testing Specific API Key ===');
    console.log('API Key:', testApiKey);
    console.log('Found:', testResult.rowCount > 0 ? 'YES' : 'NO');
    
    if (testResult.rowCount === 0) {
      // Try to create it
      console.log('\nAttempting to create widget config...');
      
      // Get Sample Restaurant
      const restaurantResult = await db.query(
        "SELECT id FROM restaurants WHERE name = 'Sample Restaurant' LIMIT 1"
      );
      
      if (restaurantResult.rowCount === 0) {
        console.log('ERROR: Sample Restaurant not found!');
        return;
      }
      
      const restaurantId = restaurantResult.rows[0].id;
      
      // Delete existing config for this restaurant if any
      await db.query(
        'DELETE FROM widget_configs WHERE restaurant_id = $1',
        [restaurantId]
      );
      
      // Create new config
      const insertResult = await db.query(`
        INSERT INTO widget_configs (
          restaurant_id, 
          api_key, 
          is_enabled, 
          theme, 
          settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        restaurantId,
        testApiKey,
        true,
        JSON.stringify({
          primaryColor: "#2E8B57",
          secondaryColor: "#F5F5DC",
          fontFamily: "Georgia, serif",
          borderRadius: "8px"
        }),
        JSON.stringify({
          showAvailableSlots: true,
          maxPartySize: 8,
          advanceBookingDays: 30,
          requirePhone: true,
          requireEmail: true,
          showSpecialRequests: true,
          confirmationMessage: "Thank you for booking with Sample Restaurant!"
        })
      ]);
      
      console.log('✅ Widget config created with ID:', insertResult.rows[0].id);
    }
    
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkWidgetConfig();
}