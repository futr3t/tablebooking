const { Client } = require('pg');
require('dotenv').config();

async function checkApiKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check what API keys exist
    const result = await client.query(`
      SELECT 
        wc.api_key,
        wc.is_enabled,
        r.name as restaurant_name,
        r.is_active as restaurant_active
      FROM widget_configs wc
      JOIN restaurants r ON r.id = wc.restaurant_id
    `);

    console.log('\nExisting API keys in database:');
    result.rows.forEach(row => {
      console.log(`- Restaurant: ${row.restaurant_name}`);
      console.log(`  API Key: ${row.api_key}`);
      console.log(`  Widget Enabled: ${row.is_enabled}`);
      console.log(`  Restaurant Active: ${row.restaurant_active}`);
      console.log('');
    });

    // Update the API key to the one you're trying to use
    const targetApiKey = 'B946B3EC9EDBB544FD29A3AAD280E78F218E20853D5C341EFC90C0AB1358B392';
    
    console.log(`\nUpdating API key to: ${targetApiKey}`);
    
    const updateResult = await client.query(`
      UPDATE widget_configs 
      SET api_key = $1
      WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Sample Restaurant')
      RETURNING *
    `, [targetApiKey]);

    if (updateResult.rowCount > 0) {
      console.log('✅ API key updated successfully');
    } else {
      console.log('❌ No widget config found for Sample Restaurant');
    }

    // Verify the update
    const verifyResult = await client.query(`
      SELECT api_key FROM widget_configs WHERE api_key = $1
    `, [targetApiKey]);

    if (verifyResult.rowCount > 0) {
      console.log('✅ API key verified in database');
    } else {
      console.log('❌ API key not found after update');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkApiKey();