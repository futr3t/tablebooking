const { Pool } = require('pg');

const connectionString = "postgresql://postgres:NImMESxwnixahpEAGfikxVNvjLMUWXnm@ballast.proxy.rlwy.net:59445/railway";

async function migrateTurnTime() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('🔄 Connecting to database...');
    
    // First, check if the column exists
    const checkResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'restaurants'
      AND column_name = 'turn_time_minutes'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ Column turn_time_minutes does not exist - migration already applied or not needed');
      return;
    }
    
    console.log('📋 Found turn_time_minutes column:', checkResult.rows[0]);
    
    // Remove the turn_time_minutes column
    console.log('🔄 Removing turn_time_minutes column...');
    await pool.query('ALTER TABLE restaurants DROP COLUMN IF EXISTS turn_time_minutes');
    
    // Verify the column has been removed
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'restaurants'
      AND column_name = 'turn_time_minutes'
    `);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('📝 The turn_time_minutes column has been removed from the restaurants table.');
      console.log('🔄 The system will now use turn time rules for all booking duration calculations.');
    } else {
      console.log('❌ Migration verification failed - column still exists');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateTurnTime().catch(console.error);