-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'manager', 'host', 'server', 'customer');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
CREATE TYPE table_shape AS ENUM ('square', 'round', 'rectangle');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'customer',
    restaurant_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    cuisine VARCHAR(100),
    description TEXT,
    max_covers INTEGER DEFAULT NULL, -- NULL = unlimited, replaces old capacity limit
    time_zone VARCHAR(50) DEFAULT 'UTC',
    turn_time_minutes INTEGER DEFAULT 120, -- Default 2 hours per booking
    stagger_minutes INTEGER DEFAULT 15, -- Minimum time between bookings
    default_slot_duration INTEGER DEFAULT 30, -- Default 30 min time slots
    opening_hours JSONB NOT NULL DEFAULT '{}',
    booking_settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tables table
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL, -- Increased size for custom numbering schemes
    capacity INTEGER NOT NULL,
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    shape table_shape DEFAULT 'round',
    position JSONB NOT NULL DEFAULT '{}',
    table_type VARCHAR(50) DEFAULT 'standard', -- standard, booth, bar, high_top, patio, private
    notes TEXT,
    is_accessible BOOLEAN DEFAULT false,
    location_notes VARCHAR(255),
    is_combinable BOOLEAN DEFAULT true, -- Can be combined with other tables
    priority INTEGER DEFAULT 0, -- Higher priority tables preferred for booking
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, number)
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    party_size INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration INTEGER DEFAULT 120, -- minutes
    status booking_status DEFAULT 'pending',
    notes TEXT,
    special_requests TEXT,
    no_show_count INTEGER DEFAULT 0,
    is_waitlisted BOOLEAN DEFAULT false,
    waitlist_position INTEGER,
    confirmation_code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for restaurant_id in users table
ALTER TABLE users ADD CONSTRAINT fk_users_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);

CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX idx_tables_is_active ON tables(is_active);

CREATE INDEX idx_bookings_restaurant_id ON bookings(restaurant_id);
CREATE INDEX idx_bookings_table_id ON bookings(table_id);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, booking_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_confirmation_code ON bookings(confirmation_code);
CREATE INDEX idx_bookings_waitlist ON bookings(is_waitlisted, waitlist_position);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate confirmation codes
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate confirmation codes
CREATE OR REPLACE FUNCTION set_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
        NEW.confirmation_code = generate_confirmation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_confirmation_code BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION set_confirmation_code();

-- Widget configurations table
CREATE TABLE widget_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    theme JSONB NOT NULL DEFAULT '{
        "primaryColor": "#1976d2",
        "secondaryColor": "#f5f5f5",
        "fontFamily": "Roboto, sans-serif",
        "borderRadius": "4px"
    }',
    settings JSONB NOT NULL DEFAULT '{
        "showAvailableSlots": true,
        "maxPartySize": 8,
        "advanceBookingDays": 30,
        "requirePhone": true,
        "requireEmail": false,
        "showSpecialRequests": true,
        "confirmationMessage": "Thank you for your reservation!"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id)
);

-- Add index for widget configs
CREATE INDEX idx_widget_configs_api_key ON widget_configs(api_key);
CREATE INDEX idx_widget_configs_restaurant_id ON widget_configs(restaurant_id);

-- Create trigger for widget configs updated_at
CREATE TRIGGER update_widget_configs_updated_at BEFORE UPDATE ON widget_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Time slot rules table for advanced scheduling
CREATE TABLE time_slot_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Lunch Service", "Dinner Service"
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL = applies to all days
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    max_concurrent_bookings INTEGER, -- Max bookings allowed at same time across all tables
    turn_time_minutes INTEGER, -- Override restaurant default for this time period
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table combinations for managing joined tables
CREATE TABLE table_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Tables 5+6", "Private Dining Area"
    table_ids UUID[] NOT NULL, -- Array of table IDs that can be combined
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    requires_approval BOOLEAN DEFAULT false, -- Staff must approve large party bookings
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for new tables
CREATE INDEX idx_time_slot_rules_restaurant_id ON time_slot_rules(restaurant_id);
CREATE INDEX idx_time_slot_rules_day_time ON time_slot_rules(day_of_week, start_time, end_time);
CREATE INDEX idx_time_slot_rules_active ON time_slot_rules(is_active);
CREATE INDEX idx_table_combinations_restaurant_id ON table_combinations(restaurant_id);
CREATE INDEX idx_table_combinations_active ON table_combinations(is_active);

-- Add triggers for new tables
CREATE TRIGGER update_time_slot_rules_updated_at BEFORE UPDATE ON time_slot_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_combinations_updated_at BEFORE UPDATE ON table_combinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 32)) || 
           UPPER(SUBSTRING(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 32));
END;
$$ LANGUAGE plpgsql;

-- Insert default super admin user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role) VALUES 
('admin@tablebooking.com', '$2a$10$K7L/XL.dq1i8p9GhN3yFGOJUJ9.dqDqDqDqDqDqDqDqDqDqDqDqDq', 'Super', 'Admin', 'super_admin');

-- Create sample restaurant data (for development)
INSERT INTO restaurants (
    name, 
    email, 
    phone, 
    address, 
    cuisine, 
    description,
    max_covers,
    turn_time_minutes,
    stagger_minutes,
    default_slot_duration,
    opening_hours,
    booking_settings
) VALUES (
    'Sample Restaurant',
    'contact@samplerestaurant.com',
    '+1234567890',
    '123 Main Street, City, State 12345',
    'Italian',
    'A cozy Italian restaurant with authentic cuisine and unlimited seating capacity',
    NULL, -- Unlimited covers
    120,  -- 2 hour default turn time
    15,   -- 15 minute stagger
    30,   -- 30 minute time slots
    '{
        "monday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
        "tuesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
        "wednesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
        "thursday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
        "friday": {"isOpen": true, "openTime": "11:00", "closeTime": "23:00"},
        "saturday": {"isOpen": true, "openTime": "11:00", "closeTime": "23:00"},
        "sunday": {"isOpen": true, "openTime": "12:00", "closeTime": "21:00"}
    }',
    '{
        "maxAdvanceBookingDays": 90,
        "minAdvanceBookingHours": 2,
        "maxPartySize": null,
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

-- Create sample tables for the restaurant with enhanced data
INSERT INTO tables (restaurant_id, number, capacity, min_capacity, max_capacity, shape, position, table_type, notes, is_accessible, location_notes, is_combinable, priority) 
SELECT 
    r.id,
    t.number,
    t.capacity,
    t.min_capacity,
    t.max_capacity,
    t.shape::table_shape,
    t.position::jsonb,
    t.table_type,
    t.notes,
    t.is_accessible,
    t.location_notes,
    t.is_combinable,
    t.priority
FROM restaurants r,
(VALUES 
    ('T1', 2, 2, 4, 'round', '{"x": 50, "y": 50, "width": 60, "height": 60}', 'bar', 'High-top bar table', true, 'Window view with city skyline', true, 0),
    ('T2', 4, 2, 6, 'round', '{"x": 150, "y": 50, "width": 80, "height": 80}', 'standard', 'Perfect for couples and small groups', false, 'Main dining area', true, 1),
    ('T3', 6, 4, 8, 'rectangle', '{"x": 280, "y": 50, "width": 120, "height": 80}', 'booth', 'Comfortable booth seating', false, 'Quiet corner with intimate lighting', true, 2),
    ('T4', 2, 2, 4, 'round', '{"x": 50, "y": 180, "width": 60, "height": 60}', 'standard', 'Cozy table for two', true, 'Near entrance, wheelchair accessible', true, 0),
    ('T5', 4, 2, 6, 'round', '{"x": 150, "y": 180, "width": 80, "height": 80}', 'standard', 'Family-friendly table', false, 'Central location in dining room', true, 1),
    ('T6', 8, 6, 10, 'rectangle', '{"x": 280, "y": 180, "width": 140, "height": 100}', 'private', 'Large table for celebrations', false, 'Private dining area with wine display', true, 3),
    ('T7', 10, 8, 12, 'rectangle', '{"x": 450, "y": 50, "width": 160, "height": 120}', 'private', 'Executive dining table', false, 'Separate room with presentation screen', false, 3),
    ('T8', 3, 2, 4, 'round', '{"x": 450, "y": 200, "width": 70, "height": 70}', 'patio', 'Outdoor terrace table', false, 'Garden view with fresh air', true, 1)
) AS t(number, capacity, min_capacity, max_capacity, shape, position, table_type, notes, is_accessible, location_notes, is_combinable, priority)
WHERE r.name = 'Sample Restaurant';

-- Create sample widget configuration for the restaurant
INSERT INTO widget_configs (restaurant_id, api_key, is_enabled, theme, settings)
SELECT 
    r.id,
    generate_api_key(),
    true,
    '{
        "primaryColor": "#2E8B57",
        "secondaryColor": "#F5F5DC",
        "fontFamily": "Georgia, serif",
        "borderRadius": "8px"
    }',
    '{
        "showAvailableSlots": true,
        "maxPartySize": 8,
        "advanceBookingDays": 30,
        "requirePhone": true,
        "requireEmail": true,
        "showSpecialRequests": true,
        "confirmationMessage": "Thank you for booking with Sample Restaurant! We look forward to serving you."
    }'
FROM restaurants r
WHERE r.name = 'Sample Restaurant';

-- Create sample time slot rules
INSERT INTO time_slot_rules (restaurant_id, name, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_bookings, turn_time_minutes)
SELECT 
    r.id,
    'Lunch Service',
    NULL, -- All days
    '12:00',
    '15:00',
    30, -- 30 minute slots
    15, -- Max 15 concurrent lunch bookings
    90  -- 1.5 hour lunch turns
FROM restaurants r 
WHERE r.name = 'Sample Restaurant';

INSERT INTO time_slot_rules (restaurant_id, name, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_bookings, turn_time_minutes)
SELECT 
    r.id,
    'Dinner Service',
    NULL, -- All days
    '17:00',
    '22:00',
    30, -- 30 minute slots
    20, -- Max 20 concurrent dinner bookings
    120 -- 2 hour dinner turns
FROM restaurants r 
WHERE r.name = 'Sample Restaurant';

INSERT INTO time_slot_rules (restaurant_id, name, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_bookings, turn_time_minutes)
SELECT 
    r.id,
    'Weekend Brunch',
    0, -- Sunday only
    '10:00',
    '14:00',
    30, -- 30 minute slots
    12, -- Max 12 concurrent brunch bookings
    90  -- 1.5 hour brunch turns
FROM restaurants r 
WHERE r.name = 'Sample Restaurant';

-- Create sample table combinations for large parties
INSERT INTO table_combinations (restaurant_id, name, table_ids, min_capacity, max_capacity, notes)
SELECT 
    r.id,
    'Private Dining Suite',
    ARRAY[
        (SELECT id FROM tables WHERE number = 'T6' AND restaurant_id = r.id),
        (SELECT id FROM tables WHERE number = 'T7' AND restaurant_id = r.id)
    ],
    14,
    22,
    'Combined private dining area perfect for business meetings and celebrations'
FROM restaurants r 
WHERE r.name = 'Sample Restaurant';

INSERT INTO table_combinations (restaurant_id, name, table_ids, min_capacity, max_capacity, requires_approval, notes)
SELECT 
    r.id,
    'Central Dining Area',
    ARRAY[
        (SELECT id FROM tables WHERE number = 'T2' AND restaurant_id = r.id),
        (SELECT id FROM tables WHERE number = 'T5' AND restaurant_id = r.id)
    ],
    6,
    12,
    false,
    'Main dining area tables that can be joined for medium parties'
FROM restaurants r 
WHERE r.name = 'Sample Restaurant';