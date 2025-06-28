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
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    cuisine VARCHAR(100),
    description TEXT,
    capacity INTEGER DEFAULT 30,
    time_zone VARCHAR(50) DEFAULT 'UTC',
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
    number VARCHAR(10) NOT NULL,
    capacity INTEGER NOT NULL,
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    shape table_shape DEFAULT 'round',
    position JSONB NOT NULL DEFAULT '{}',
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
    opening_hours,
    booking_settings
) VALUES (
    'Sample Restaurant',
    'contact@samplerestaurant.com',
    '+1234567890',
    '123 Main Street, City, State 12345',
    'Italian',
    'A cozy Italian restaurant with authentic cuisine',
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
        "maxAdvanceBookingDays": 30,
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
    ('T1', 2, 2, 4, 'round', '{"x": 50, "y": 50, "width": 60, "height": 60}'),
    ('T2', 4, 2, 6, 'round', '{"x": 150, "y": 50, "width": 80, "height": 80}'),
    ('T3', 6, 4, 8, 'rectangle', '{"x": 280, "y": 50, "width": 120, "height": 80}'),
    ('T4', 2, 2, 4, 'round', '{"x": 50, "y": 180, "width": 60, "height": 60}'),
    ('T5', 4, 2, 6, 'round', '{"x": 150, "y": 180, "width": 80, "height": 80}'),
    ('T6', 8, 6, 10, 'rectangle', '{"x": 280, "y": 180, "width": 140, "height": 100}')
) AS t(number, capacity, min_capacity, max_capacity, shape, position)
WHERE r.name = 'Sample Restaurant';