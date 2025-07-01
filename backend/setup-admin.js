const { Pool } = require('pg');
require('dotenv').config();

const setupAdmin = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Setting up admin user...');

    // Create restaurant
    const restaurantResult = await pool.query(`
      INSERT INTO restaurants (name, email, phone, address, opening_hours, booking_settings) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      'Demo Restaurant',
      'demo@restaurant.com', 
      '+1234567890',
      '123 Main St, City, State',
      JSON.stringify({}),
      JSON.stringify({})
    ]);

    console.log('Restaurant created or already exists');

    // Get restaurant ID
    const getRestaurant = await pool.query(
      'SELECT id FROM restaurants WHERE email = $1',
      ['demo@restaurant.com']
    );
    
    const restaurantId = getRestaurant.rows[0].id;

    // Create admin user
    await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role, restaurant_id, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'admin@restaurant.com',
      '$2b$10$QtPJTkNuF5MGU8LL1uZMjOMokNbLfysSCUvgcJAeRuGxoR1l59gWy',
      'Admin',
      'User',
      'owner',
      restaurantId,
      true
    ]);

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('Email: admin@restaurant.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await pool.end();
  }
};

setupAdmin();