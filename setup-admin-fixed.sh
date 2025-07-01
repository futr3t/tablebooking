#!/bin/bash

echo "🚀 Setting up Restaurant Booking Platform Admin User"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-admin-fixed.sh \"DATABASE_URL\""
    echo ""
    echo "Get your DATABASE_URL from Railway:"
    echo "1. Go to Railway → PostgreSQL service → Connect tab"
    echo "2. Copy the 'Postgres Connection URL'"
    echo "3. Run: ./setup-admin-fixed.sh \"postgresql://postgres:password@host:port/database\""
    exit 1
fi

DATABASE_URL="$1"

echo "Creating admin user with correct schema..."
echo ""

# Create admin user with correct field names
psql "$DATABASE_URL" << EOF
-- Create restaurant (check if exists first)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM restaurants WHERE email = 'demo@restaurant.com') THEN
        INSERT INTO restaurants (name, email, phone, address, opening_hours, booking_settings) 
        VALUES (
            'Demo Restaurant',
            'demo@restaurant.com',
            '+1234567890',
            '123 Main St, City, State',
            '{}',
            '{}'
        );
        RAISE NOTICE 'Restaurant created successfully';
    ELSE
        RAISE NOTICE 'Restaurant already exists';
    END IF;
END
\$\$;

-- Create or update admin user (using correct field names)
DO \$\$
DECLARE
    restaurant_uuid UUID;
BEGIN
    -- Get restaurant ID
    SELECT id INTO restaurant_uuid FROM restaurants WHERE email = 'demo@restaurant.com';
    
    -- Create or update user
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@restaurant.com') THEN
        UPDATE users SET 
            password = '\$2b\$10\$QtPJTkNuF5MGU8LL1uZMjOMokNbLfysSCUvgcJAeRuGxoR1l59gWy',
            restaurant_id = restaurant_uuid
        WHERE email = 'admin@restaurant.com';
        RAISE NOTICE 'Admin user updated successfully';
    ELSE
        INSERT INTO users (email, password, first_name, last_name, role, restaurant_id, is_active) 
        VALUES (
            'admin@restaurant.com',
            '\$2b\$10\$QtPJTkNuF5MGU8LL1uZMjOMokNbLfysSCUvgcJAeRuGxoR1l59gWy',
            'Admin',
            'User',
            'owner',
            restaurant_uuid,
            true
        );
        RAISE NOTICE 'Admin user created successfully';
    END IF;
END
\$\$;

-- Verify setup
SELECT 'Restaurant:' as info, name, email FROM restaurants WHERE email = 'demo@restaurant.com';
SELECT 'Admin User:' as info, email, first_name, last_name, role FROM users WHERE email = 'admin@restaurant.com';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "🔑 Login Credentials:"
    echo "   Email:    admin@restaurant.com"
    echo "   Password: admin123"
    echo ""
    echo "🌐 You can now login to your frontend application!"
else
    echo ""
    echo "❌ Setup failed. Please check the error messages above."
fi