-- Migration: Add party-size-specific turn times feature
-- This allows restaurants to configure different turn times based on party size

-- Create table for party-size-specific turn time rules
CREATE TABLE IF NOT EXISTS turn_time_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100), -- e.g., "Small parties", "Large groups"
    min_party_size INTEGER NOT NULL,
    max_party_size INTEGER NOT NULL,
    turn_time_minutes INTEGER NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0, -- Higher priority rules take precedence
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure party size ranges don't overlap for same restaurant
    CONSTRAINT valid_party_size_range CHECK (min_party_size <= max_party_size),
    CONSTRAINT positive_party_sizes CHECK (min_party_size > 0)
);

-- Create indexes for performance
CREATE INDEX idx_turn_time_rules_restaurant_id ON turn_time_rules(restaurant_id);
CREATE INDEX idx_turn_time_rules_party_size ON turn_time_rules(restaurant_id, min_party_size, max_party_size);
CREATE INDEX idx_turn_time_rules_active ON turn_time_rules(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_turn_time_rules_updated_at 
    BEFORE UPDATE ON turn_time_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add column to restaurants table for date format preference (if not exists)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';

-- Insert sample turn time rules for the demo restaurant
INSERT INTO turn_time_rules (restaurant_id, name, min_party_size, max_party_size, turn_time_minutes, description, priority)
SELECT 
    id,
    'Small parties',
    1,
    2,
    90,
    'Quick turn for couples and solo diners',
    1
FROM restaurants 
WHERE name = 'The Gourmet Kitchen'
AND NOT EXISTS (
    SELECT 1 FROM turn_time_rules 
    WHERE restaurant_id = restaurants.id 
    AND min_party_size = 1 
    AND max_party_size = 2
);

INSERT INTO turn_time_rules (restaurant_id, name, min_party_size, max_party_size, turn_time_minutes, description, priority)
SELECT 
    id,
    'Standard groups',
    3,
    4,
    120,
    'Standard dining time for small groups',
    1
FROM restaurants 
WHERE name = 'The Gourmet Kitchen'
AND NOT EXISTS (
    SELECT 1 FROM turn_time_rules 
    WHERE restaurant_id = restaurants.id 
    AND min_party_size = 3 
    AND max_party_size = 4
);

INSERT INTO turn_time_rules (restaurant_id, name, min_party_size, max_party_size, turn_time_minutes, description, priority)
SELECT 
    id,
    'Large parties',
    5,
    8,
    150,
    'Extended time for larger groups',
    1
FROM restaurants 
WHERE name = 'The Gourmet Kitchen'
AND NOT EXISTS (
    SELECT 1 FROM turn_time_rules 
    WHERE restaurant_id = restaurants.id 
    AND min_party_size = 5 
    AND max_party_size = 8
);

INSERT INTO turn_time_rules (restaurant_id, name, min_party_size, max_party_size, turn_time_minutes, description, priority)
SELECT 
    id,
    'Special events',
    9,
    20,
    180,
    'Extra time for large groups and events',
    1
FROM restaurants 
WHERE name = 'The Gourmet Kitchen'
AND NOT EXISTS (
    SELECT 1 FROM turn_time_rules 
    WHERE restaurant_id = restaurants.id 
    AND min_party_size = 9 
    AND max_party_size = 20
);

-- Create a function to get the appropriate turn time for a party size
CREATE OR REPLACE FUNCTION get_turn_time_for_party(
    p_restaurant_id UUID,
    p_party_size INTEGER,
    p_booking_time TIME DEFAULT NULL,
    p_day_of_week INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_turn_time INTEGER;
BEGIN
    -- First, check party-size-specific rules
    SELECT turn_time_minutes INTO v_turn_time
    FROM turn_time_rules
    WHERE restaurant_id = p_restaurant_id
        AND p_party_size >= min_party_size
        AND p_party_size <= max_party_size
        AND is_active = true
    ORDER BY priority DESC, (max_party_size - min_party_size) ASC -- Prefer more specific rules
    LIMIT 1;
    
    IF v_turn_time IS NOT NULL THEN
        RETURN v_turn_time;
    END IF;
    
    -- Next, check time slot rules if time and day provided
    IF p_booking_time IS NOT NULL THEN
        SELECT turn_time_minutes INTO v_turn_time
        FROM time_slot_rules
        WHERE restaurant_id = p_restaurant_id
            AND (day_of_week IS NULL OR day_of_week = p_day_of_week)
            AND p_booking_time >= start_time
            AND p_booking_time <= end_time
            AND turn_time_minutes IS NOT NULL
            AND is_active = true
        ORDER BY day_of_week DESC NULLS LAST -- Prefer day-specific rules
        LIMIT 1;
        
        IF v_turn_time IS NOT NULL THEN
            RETURN v_turn_time;
        END IF;
    END IF;
    
    -- Finally, fall back to restaurant default
    SELECT turn_time_minutes INTO v_turn_time
    FROM restaurants
    WHERE id = p_restaurant_id;
    
    RETURN COALESCE(v_turn_time, 120); -- Default to 120 minutes if all else fails
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION get_turn_time_for_party IS 'Gets the appropriate turn time for a booking based on party size, with fallback to time slot rules and restaurant defaults';