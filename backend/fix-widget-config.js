const { Client } = require('pg');
require('dotenv').config();

async function fixWidgetConfig() {
  // Use the Railway DATABASE_URL for production
  const databaseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.DATABASE_URL 
    : 'postgresql://localhost:5432/tablebooking';

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');
    console.log('Database URL:', databaseUrl.substring(0, 30) + '...');

    // First, check if widget_configs table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'widget_configs'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ widget_configs table does not exist!');
      console.log('Please run the schema.sql file to create the table.');
      return;
    }

    console.log('✅ widget_configs table exists');

    // Check existing widget configs
    const existingConfigs = await client.query(`
      SELECT 
        wc.id,
        wc.api_key,
        wc.is_enabled,
        r.name as restaurant_name
      FROM widget_configs wc
      LEFT JOIN restaurants r ON r.id = wc.restaurant_id
    `);

    console.log('\nExisting widget configs:');
    if (existingConfigs.rowCount === 0) {
      console.log('No widget configs found');
    } else {
      existingConfigs.rows.forEach(row => {
        console.log(`- Restaurant: ${row.restaurant_name}`);
        console.log(`  ID: ${row.id}`);
        console.log(`  API Key: ${row.api_key}`);
        console.log(`  Enabled: ${row.is_enabled}`);
      });
    }

    // Get the sample restaurant
    const restaurantResult = await client.query(`
      SELECT id, name FROM restaurants WHERE name = 'Sample Restaurant'
    `);

    if (restaurantResult.rowCount === 0) {
      console.log('\n❌ Sample Restaurant not found!');
      return;
    }

    const restaurant = restaurantResult.rows[0];
    console.log(`\n✅ Found restaurant: ${restaurant.name} (ID: ${restaurant.id})`);

    // Check if widget config exists for this restaurant
    const widgetConfigResult = await client.query(`
      SELECT * FROM widget_configs WHERE restaurant_id = $1
    `, [restaurant.id]);

    const targetApiKey = 'B946B3EC9EDBB544FD29A3AAD280E78F218E20853D5C341EFC90C0AB1358B392';

    if (widgetConfigResult.rowCount === 0) {
      // Create new widget config
      console.log('\nCreating new widget config...');
      
      const insertResult = await client.query(`
        INSERT INTO widget_configs (
          restaurant_id, 
          api_key, 
          is_enabled, 
          theme, 
          settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        restaurant.id,
        targetApiKey,
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
          confirmationMessage: "Thank you for booking with Sample Restaurant! We look forward to serving you."
        })
      ]);

      console.log('✅ Widget config created successfully');
      console.log(`   API Key: ${insertResult.rows[0].api_key}`);
    } else {
      // Update existing widget config
      console.log('\nUpdating existing widget config...');
      
      const updateResult = await client.query(`
        UPDATE widget_configs 
        SET api_key = $1, is_enabled = true
        WHERE restaurant_id = $2
        RETURNING *
      `, [targetApiKey, restaurant.id]);

      console.log('✅ Widget config updated successfully');
      console.log(`   API Key: ${updateResult.rows[0].api_key}`);
    }

    // Verify the configuration
    const verifyResult = await client.query(`
      SELECT 
        wc.*,
        r.name as restaurant_name
      FROM widget_configs wc
      JOIN restaurants r ON r.id = wc.restaurant_id
      WHERE wc.api_key = $1
    `, [targetApiKey]);

    if (verifyResult.rowCount > 0) {
      console.log('\n✅ Verification successful!');
      console.log('Widget config is properly set up with the expected API key.');
    } else {
      console.log('\n❌ Verification failed!');
      console.log('Widget config not found with the expected API key.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the fix
fixWidgetConfig();