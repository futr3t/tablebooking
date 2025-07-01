-- =====================================================
-- DATABASE MIGRATIONS FOR ENHANCED TABLE MANAGEMENT
-- =====================================================

-- Migration 1: Remove 30-cover limitation and enhance restaurants table
ALTER TABLE restaurants 
DROP COLUMN IF EXISTS capacity,
ADD COLUMN IF NOT EXISTS max_covers INTEGER DEFAULT NULL, -- No limit by default
ADD COLUMN IF NOT EXISTS turn_time_minutes INTEGER DEFAULT 120, -- Default 2 hours
ADD COLUMN IF NOT EXISTS stagger_minutes INTEGER DEFAULT 15, -- 15 min stagger between bookings
ADD COLUMN IF NOT EXISTS default_slot_duration INTEGER DEFAULT 30; -- 30 min slots

-- Migration 2: Enhance tables table with new fields
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS table_type VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_notes VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_combinable BOOLEAN DEFAULT true, -- Can be combined with other tables
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0; -- Higher priority tables preferred for booking

-- Migration 3: Create time_slot_rules table for advanced scheduling
CREATE TABLE IF NOT EXISTS time_slot_rules (
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_slot_rules_restaurant_id ON time_slot_rules(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_rules_day_time ON time_slot_rules(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_time_slot_rules_active ON time_slot_rules(is_active);

-- Add updated_at trigger for time_slot_rules
CREATE TRIGGER IF NOT EXISTS update_time_slot_rules_updated_at 
BEFORE UPDATE ON time_slot_rules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration 4: Update booking_settings in restaurants to remove limits
UPDATE restaurants 
SET booking_settings = booking_settings - 'maxPartySize' || '{"maxPartySize": null}'::jsonb
WHERE booking_settings ? 'maxPartySize' AND (booking_settings->>'maxPartySize')::integer = 8;

-- Migration 5: Add enhanced table types enum (for reference, not enforced)
COMMENT ON COLUMN tables.table_type IS 'Table types: standard, booth, bar, high_top, patio, private, banquette, communal';

-- Migration 6: Create table_combinations table for managing joined tables
CREATE TABLE IF NOT EXISTS table_combinations (
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

-- Add indexes for table combinations
CREATE INDEX IF NOT EXISTS idx_table_combinations_restaurant_id ON table_combinations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_combinations_active ON table_combinations(is_active);

-- Add updated_at trigger for table_combinations
CREATE TRIGGER IF NOT EXISTS update_table_combinations_updated_at 
BEFORE UPDATE ON table_combinations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration 7: Update sample restaurant data to remove capacity limits
UPDATE restaurants 
SET max_covers = NULL,
    turn_time_minutes = 120,
    stagger_minutes = 15,
    default_slot_duration = 30
WHERE name = 'Sample Restaurant';

-- Migration 8: Add sample time slot rules for the demo restaurant
INSERT INTO time_slot_rules (restaurant_id, name, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_bookings, turn_time_minutes)
SELECT 
    r.id,
    'Lunch Service',
    NULL, -- All days
    '12:00',
    '15:00',
    30,
    20, -- Max 20 concurrent lunch bookings
    90  -- 1.5 hour lunch turns
FROM restaurants r 
WHERE r.name = 'Sample Restaurant'
AND NOT EXISTS (
    SELECT 1 FROM time_slot_rules tsr 
    WHERE tsr.restaurant_id = r.id AND tsr.name = 'Lunch Service'
);

INSERT INTO time_slot_rules (restaurant_id, name, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_bookings, turn_time_minutes)
SELECT 
    r.id,
    'Dinner Service',
    NULL, -- All days
    '17:00',
    '22:00',
    30,
    25, -- Max 25 concurrent dinner bookings
    120 -- 2 hour dinner turns
FROM restaurants r 
WHERE r.name = 'Sample Restaurant'
AND NOT EXISTS (
    SELECT 1 FROM time_slot_rules tsr 
    WHERE tsr.restaurant_id = r.id AND tsr.name = 'Dinner Service'
);

-- Migration 9: Update existing tables with enhanced data
UPDATE tables 
SET table_type = CASE 
    WHEN capacity <= 2 THEN 'bar'
    WHEN capacity >= 8 THEN 'booth'
    ELSE 'standard'
END,
is_accessible = CASE 
    WHEN number IN ('T1', 'T4') THEN true -- Make some tables accessible
    ELSE false
END,
location_notes = CASE 
    WHEN number LIKE '%1' THEN 'Window view'
    WHEN number LIKE '%6' THEN 'Private corner'
    ELSE 'Main dining area'
END,
priority = CASE 
    WHEN capacity >= 6 THEN 2 -- Higher priority for larger tables
    WHEN table_type = 'booth' THEN 1
    ELSE 0
END
WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Sample Restaurant');

-- Migration 10: Create sample table combination for large parties
INSERT INTO table_combinations (restaurant_id, name, table_ids, min_capacity, max_capacity, notes)
SELECT 
    r.id,
    'Large Party Area (T3+T6)',
    ARRAY[t3.id, t6.id],
    10,
    18,
    'Perfect for celebrations and large groups'
FROM restaurants r
CROSS JOIN (SELECT id FROM tables WHERE number = 'T3' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Sample Restaurant' LIMIT 1)) t3
CROSS JOIN (SELECT id FROM tables WHERE number = 'T6' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Sample Restaurant' LIMIT 1)) t6
WHERE r.name = 'Sample Restaurant'
AND NOT EXISTS (
    SELECT 1 FROM table_combinations tc 
    WHERE tc.restaurant_id = r.id AND tc.name = 'Large Party Area (T3+T6)'
);

-- Migration 11: Add helpful comments for future reference
COMMENT ON TABLE time_slot_rules IS 'Defines time periods and booking rules for different service periods (lunch, dinner, etc.)';
COMMENT ON TABLE table_combinations IS 'Defines which tables can be combined for larger parties and their combined capacity';
COMMENT ON COLUMN restaurants.max_covers IS 'Maximum total covers for restaurant. NULL = unlimited';
COMMENT ON COLUMN restaurants.turn_time_minutes IS 'Default time each table booking lasts';
COMMENT ON COLUMN restaurants.stagger_minutes IS 'Minimum time between bookings to allow for table prep';

-- Verify migrations completed successfully
SELECT 'Migrations completed successfully. Enhanced table management features are now available.' as status;