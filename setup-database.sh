#!/bin/bash

echo "🚀 Setting up Restaurant Booking Platform Database"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-database.sh \"DATABASE_URL\""
    echo ""
    echo "Get your DATABASE_URL from Railway:"
    echo "1. Go to Railway → PostgreSQL service → Connect tab"
    echo "2. Copy the 'Postgres Connection URL'"
    echo "3. Run: ./setup-database.sh \"postgresql://postgres:password@host:port/database\""
    exit 1
fi

DATABASE_URL="$1"

echo "Step 1: Creating database schema..."
echo ""

# Run the schema file
psql "$DATABASE_URL" -f backend/src/config/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema created successfully!"
    echo ""
    echo "Step 2: Creating admin user..."
    echo ""
    
    # Now create admin user
    psql "$DATABASE_URL" << EOF
-- Create restaurant
INSERT INTO restaurants (name, email, phone, address, opening_hours, booking_settings) 
VALUES (
  'Demo Restaurant',
  'demo@restaurant.com',
  '+1234567890',
  '123 Main St, City, State',
  '{}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Create admin user
INSERT INTO users (email, password, first_name, last_name, role, restaurant_id, is_active) 
VALUES (
  'admin@restaurant.com',
  '\$2b\$10\$QtPJTkNuF5MGU8LL1uZMjOMokNbLfysSCUvgcJAeRuGxoR1l59gWy',
  'Admin',
  'User',
  'owner',
  (SELECT id FROM restaurants WHERE name = 'Demo Restaurant'),
  true
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  restaurant_id = EXCLUDED.restaurant_id;

-- Verify setup
SELECT 'Restaurant created:' as status, name, email FROM restaurants WHERE email = 'demo@restaurant.com';
SELECT 'Admin user created:' as status, email, first_name, last_name, role FROM users WHERE email = 'admin@restaurant.com';
EOF

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Complete setup finished successfully!"
        echo ""
        echo "🔑 Login Credentials:"
        echo "   Email:    admin@restaurant.com"
        echo "   Password: admin123"
        echo ""
        echo "🌐 You can now login to your frontend application!"
    else
        echo ""
        echo "❌ Admin user creation failed."
    fi
else
    echo ""
    echo "❌ Database schema creation failed. Please check your DATABASE_URL and try again."
fi