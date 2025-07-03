-- Schema updates for optimized booking system

-- Add new columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS dietary_requirements TEXT,
ADD COLUMN IF NOT EXISTS occasion VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_seating VARCHAR(100),
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create dietary requirements reference table
CREATE TABLE IF NOT EXISTS dietary_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- 'allergy', 'intolerance', 'preference', 'religious'
    description TEXT,
    common_ingredients TEXT[],
    severity VARCHAR(20), -- 'life_threatening', 'severe', 'moderate', 'mild'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create booking templates table for regular customers
CREATE TABLE IF NOT EXISTS booking_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    preferred_party_size INTEGER,
    dietary_requirements TEXT,
    preferred_seating VARCHAR(100),
    special_requests TEXT,
    is_vip BOOLEAN DEFAULT false,
    notes TEXT,
    last_booking_date DATE,
    total_bookings INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, customer_phone)
);

-- Create occasions reference table
CREATE TABLE IF NOT EXISTS booking_occasions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50),
    requires_special_setup BOOLEAN DEFAULT false,
    default_duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_dietary_requirements ON bookings USING gin(to_tsvector('english', dietary_requirements));
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
CREATE INDEX IF NOT EXISTS idx_booking_templates_phone ON booking_templates(customer_phone);
CREATE INDEX IF NOT EXISTS idx_booking_templates_restaurant ON booking_templates(restaurant_id);

-- Insert common dietary requirements
INSERT INTO dietary_requirements (name, category, description, severity, common_ingredients) VALUES
('Peanut Allergy', 'allergy', 'Severe allergic reaction to peanuts and peanut products', 'life_threatening', ARRAY['peanuts', 'peanut oil', 'peanut butter']),
('Tree Nut Allergy', 'allergy', 'Allergic reaction to tree nuts', 'life_threatening', ARRAY['almonds', 'cashews', 'walnuts', 'pecans', 'hazelnuts']),
('Shellfish Allergy', 'allergy', 'Allergic reaction to shellfish', 'severe', ARRAY['shrimp', 'lobster', 'crab', 'oysters', 'mussels']),
('Dairy Allergy', 'allergy', 'Allergic reaction to milk proteins', 'severe', ARRAY['milk', 'cheese', 'butter', 'yogurt', 'cream']),
('Egg Allergy', 'allergy', 'Allergic reaction to eggs', 'moderate', ARRAY['eggs', 'mayonnaise', 'meringue']),
('Gluten Intolerance/Celiac', 'intolerance', 'Cannot digest gluten proteins', 'severe', ARRAY['wheat', 'barley', 'rye', 'bread', 'pasta']),
('Lactose Intolerance', 'intolerance', 'Cannot digest lactose', 'moderate', ARRAY['milk', 'ice cream', 'soft cheeses']),
('Vegetarian', 'preference', 'No meat or fish', 'mild', ARRAY['meat', 'poultry', 'fish']),
('Vegan', 'preference', 'No animal products', 'mild', ARRAY['meat', 'dairy', 'eggs', 'honey']),
('Halal', 'religious', 'Food prepared according to Islamic law', 'moderate', ARRAY['pork', 'alcohol']),
('Kosher', 'religious', 'Food prepared according to Jewish law', 'moderate', ARRAY['pork', 'shellfish', 'mixing meat and dairy']),
('Pescatarian', 'preference', 'Vegetarian plus fish', 'mild', ARRAY['meat', 'poultry']),
('Soy Allergy', 'allergy', 'Allergic reaction to soy products', 'moderate', ARRAY['soy sauce', 'tofu', 'edamame', 'soy milk']),
('Fish Allergy', 'allergy', 'Allergic reaction to fish', 'severe', ARRAY['all fish species']),
('Low Sodium', 'preference', 'Restricted sodium intake', 'mild', ARRAY['high sodium foods']),
('Diabetic', 'preference', 'Low sugar/carbohydrate diet', 'moderate', ARRAY['sugar', 'high carb foods'])
ON CONFLICT (name) DO NOTHING;

-- Insert common booking occasions
INSERT INTO booking_occasions (name, icon, requires_special_setup, default_duration_minutes) VALUES
('Birthday', '🎂', true, 150),
('Anniversary', '💑', true, 180),
('Business Meeting', '💼', false, 120),
('Date Night', '❤️', false, 150),
('Family Gathering', '👨‍👩‍👧‍👦', false, 180),
('Celebration', '🎉', true, 180),
('Casual Dining', '🍽️', false, 90),
('Special Event', '✨', true, 180),
('First Date', '🌹', false, 120),
('Graduation', '🎓', true, 180)
ON CONFLICT (name) DO NOTHING;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dietary_requirements_updated_at BEFORE UPDATE ON dietary_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_templates_updated_at BEFORE UPDATE ON booking_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();