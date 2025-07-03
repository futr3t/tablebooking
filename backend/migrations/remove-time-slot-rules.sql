-- Migration: Remove time_slot_rules table and related structures
-- Date: 2025-01-03
-- Description: Consolidate time slot functionality into enhanced opening_hours JSON structure

-- Before running this migration, ensure all restaurants have migrated their 
-- time slot rules to the new opening hours format

-- Step 1: Drop indexes related to time_slot_rules
DROP INDEX IF EXISTS idx_time_slot_rules_restaurant_id;
DROP INDEX IF EXISTS idx_time_slot_rules_day_time; 
DROP INDEX IF EXISTS idx_time_slot_rules_active;

-- Step 2: Drop trigger for time_slot_rules
DROP TRIGGER IF EXISTS update_time_slot_rules_updated_at ON time_slot_rules;

-- Step 3: Drop the time_slot_rules table
DROP TABLE IF EXISTS time_slot_rules;

-- Step 4: Remove sample time slot rules data from schema 
-- (These were being inserted in the schema.sql file)
-- No action needed - future schema.sql will be updated

-- Step 5: Add helpful comment to restaurants table
COMMENT ON COLUMN restaurants.opening_hours IS 'Enhanced opening hours supporting multiple service periods per day. Format: {"monday": {"isOpen": true, "periods": [{"name": "Lunch", "startTime": "12:00", "endTime": "15:00"}, {"name": "Dinner", "startTime": "17:00", "endTime": "22:00"}]}}';

-- Migration completed successfully
-- Time slot rules functionality has been consolidated into enhanced opening_hours structure
-- Restaurants can now configure multiple service periods per day directly in opening_hours