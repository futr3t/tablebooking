#!/bin/bash

echo "🚀 Setting up admin user for Restaurant Booking Platform"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-admin-remote.sh \"DATABASE_URL\""
    echo ""
    echo "Get your DATABASE_URL from Railway:"
    echo "1. Go to Railway → PostgreSQL service → Connect tab"
    echo "2. Copy the 'Postgres Connection URL'"
    echo "3. Run: ./setup-admin-remote.sh \"postgresql://postgres:password@host:port/database\""
    exit 1
fi

DATABASE_URL="$1"

echo "Connecting to database..."
echo ""

# First check if tables exist
echo "Checking database structure..."
TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('users', 'restaurants', 'tables', 'bookings');")

if [ "$TABLE_CHECK" -lt 4 ]; then
    echo "❌ Database tables not found. Please run the schema setup first."
    exit 1
fi

# Create restaurant and admin user with proper transaction handling
psql "$DATABASE_URL" << 'EOF'
BEGIN;

-- Delete existing demo restaurant and admin user if they exist
DELETE FROM users WHERE email = 'admin@restaurant.com';
DELETE FROM restaurants WHERE email = 'demo@restaurant.com';

-- Create restaurant with proper opening hours
INSERT INTO restaurants (
    name, 
    email, 
    phone, 
    address, 
    cuisine,
    description,
    capacity,
    opening_hours, 
    booking_settings
) 
VALUES (
    'Demo Restaurant',
    'demo@restaurant.com',
    '+1234567890',
    '123 Main St, City, State',
    'Contemporary',
    'A modern restaurant with excellent cuisine',
    50,
    '{
        "monday": {"isOpen": false},
        "tuesday": {"isOpen": false},
        "wednesday": {"isOpen": true, "openTime": "17:00", "closeTime": "21:00"},
        "thursday": {"isOpen": true, "openTime": "17:00", "closeTime": "21:00"},
        "friday": {"isOpen": true, "openTime": "17:00", "closeTime": "21:00"},
        "saturday": {"isOpen": true, "openTime": "17:00", "closeTime": "21:00"},
        "sunday": {"isOpen": true, "openTime": "12:00", "closeTime": "14:00", "dinner": {"openTime": "17:00", "closeTime": "21:00"}}
    }',
    '{
        "maxAdvanceBookingDays": 270,
        "minAdvanceBookingHours": 2,
        "maxPartySize": 8,
        "slotDuration": 30,
        "bufferTime": 15,
        "enableWaitlist": true,
        "requirePhone": true,
        "requireEmail": false,
        "autoConfirm": false,
        "sendConfirmationEmail": true,
        "sendConfirmationSMS": false,
        "sendReminderEmail": true,
        "sendReminderSMS": false,
        "reminderHours": 24
    }'
);

-- Create admin user with bcrypt password hash for 'admin123'
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    restaurant_id, 
    is_active
) 
VALUES (
    'admin@restaurant.com',
    '$2b$10$QtPJTkNuF5MGU8LL1uZMjOMokNbLfysSCUvgcJAeRuGxoR1l59gWy',
    'Admin',
    'User',
    'owner',
    (SELECT id FROM restaurants WHERE email = 'demo@restaurant.com'),
    true
);

-- Create sample tables for the restaurant
INSERT INTO tables (restaurant_id, number, capacity, min_capacity, max_capacity, shape, position) 
SELECT 
    r.id,
    t.number,
    t.capacity,
    t.min_capacity,
    t.max_capacity,
    t.shape::table_shape,
    t.position::jsonb
FROM restaurants r,
(VALUES 
    ('T1', 2, 1, 2, 'round', '{"x": 50, "y": 50}'),
    ('T2', 4, 2, 4, 'round', '{"x": 150, "y": 50}'),
    ('T3', 6, 4, 6, 'rectangle', '{"x": 280, "y": 50}'),
    ('T4', 2, 1, 2, 'round', '{"x": 50, "y": 180}'),
    ('T5', 4, 2, 4, 'round', '{"x": 150, "y": 180}'),
    ('T6', 8, 6, 8, 'rectangle', '{"x": 280, "y": 180}')
) AS t(number, capacity, min_capacity, max_capacity, shape, position)
WHERE r.email = 'demo@restaurant.com';

COMMIT;

-- Verify setup
SELECT 'Restaurant created:' as status, name, email FROM restaurants WHERE email = 'demo@restaurant.com';
SELECT 'Admin user created:' as status, email, first_name, last_name, role FROM users WHERE email = 'admin@restaurant.com';
SELECT 'Tables created:' as status, COUNT(*) as count FROM tables WHERE restaurant_id = (SELECT id FROM restaurants WHERE email = 'demo@restaurant.com');
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "🔑 Login Credentials:"
    echo "   Email:    admin@restaurant.com"
    echo "   Password: admin123"
    echo ""
    echo "📅 Restaurant Hours:"
    echo "   Wed-Sat: 5:00 PM - 9:00 PM"
    echo "   Sunday:  12:00 PM - 2:00 PM & 5:00 PM - 9:00 PM"
    echo "   Mon-Tue: Closed"
    echo ""
    echo "🌐 You can now login to your frontend application!"
else
    echo ""
    echo "❌ Setup failed. Please check your DATABASE_URL and try again."
    echo "Common issues:"
    echo "- Ensure the database URL is correct and accessible"
    echo "- Check if the database schema has been created"
    echo "- Verify PostgreSQL extensions are enabled"
fi