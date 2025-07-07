const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function applyBookingsMigration() {
  console.log('🚨 CRITICAL: Fixing Bookings Table Schema');
  console.log('=' .repeat(50));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check current bookings columns
    console.log('\n🔍 Checking current bookings table columns...');
    const currentColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN (
        'dietary_requirements', 'occasion', 'preferred_seating', 'marketing_consent',
        'source', 'created_by', 'is_vip', 'internal_notes', 'metadata'
      )
      ORDER BY column_name;
    `);
    
    console.log('Current booking columns found:', currentColumns.rows);
    const existingColumns = currentColumns.rows.map(row => row.column_name);
    const requiredColumns = ['dietary_requirements', 'occasion', 'preferred_seating', 'marketing_consent', 'source', 'created_by', 'is_vip', 'internal_notes', 'metadata'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    console.log('Missing columns:', missingColumns);

    if (missingColumns.length === 0) {
      console.log('✅ All required booking columns already exist!');
      return;
    }

    // Apply the migration
    console.log('\n🔧 Applying bookings schema migration...');
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'fix-bookings-schema.sql'), 'utf8');
    
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
      WHERE table_name = 'bookings' 
      AND column_name IN (
        'dietary_requirements', 'occasion', 'preferred_seating', 'marketing_consent',
        'source', 'created_by', 'is_vip', 'internal_notes', 'metadata'
      )
      ORDER BY column_name;
    `);
    
    console.log('Columns after migration:', verifyColumns.rows);

    // Check booking count
    console.log('\n📊 Checking existing bookings...');
    const bookingCount = await pool.query('SELECT COUNT(*) as booking_count FROM bookings');
    console.log('Existing bookings:', bookingCount.rows[0].booking_count);

    console.log('\n🎉 Bookings schema migration completed successfully!');
    console.log('🚀 Booking creation should now work properly!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
applyBookingsMigration()
  .then(() => {
    console.log('\n✅ All done! Booking creation should now work in production.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Bookings migration failed:', error);
    process.exit(1);
  });