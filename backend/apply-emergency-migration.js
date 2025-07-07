const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function applyEmergencyMigration() {
  console.log('🚨 Emergency Database Migration - Adding Missing Columns');
  console.log('=' .repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check current columns
    console.log('\n🔍 Checking current restaurant table columns...');
    const currentColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('max_covers', 'turn_time_minutes', 'stagger_minutes', 'default_slot_duration')
      ORDER BY column_name;
    `);
    
    console.log('Current columns found:', currentColumns.rows);

    // Apply the migration
    console.log('\n🔧 Applying emergency migration...');
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'fix-missing-columns.sql'), 'utf8');
    
    // Split and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        const result = await pool.query(statement.trim());
        if (result.rows && result.rows.length > 0) {
          console.log('Result:', result.rows);
        }
      }
    }

    // Verify the migration worked
    console.log('\n✅ Migration completed! Verifying...');
    const verifyColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('max_covers', 'turn_time_minutes', 'stagger_minutes', 'default_slot_duration')
      ORDER BY column_name;
    `);
    
    console.log('Columns after migration:', verifyColumns.rows);

    // Check restaurant data
    console.log('\n📊 Checking restaurant data...');
    const restaurantData = await pool.query(`
      SELECT id, name, max_covers, turn_time_minutes, stagger_minutes, default_slot_duration
      FROM restaurants
      LIMIT 5;
    `);
    
    console.log('Restaurant data sample:', restaurantData.rows);

    console.log('\n🎉 Emergency migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
applyEmergencyMigration()
  .then(() => {
    console.log('\n✅ All done! The booking system should now work properly.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });