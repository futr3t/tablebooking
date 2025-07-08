-- Migration to remove turn_time_minutes field from restaurants table
-- This field is being replaced by the turn time rules system

-- Remove the turn_time_minutes column from restaurants table
ALTER TABLE restaurants DROP COLUMN IF EXISTS turn_time_minutes;

-- Verify the column has been removed
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
AND column_name = 'turn_time_minutes';

-- This should return no rows if the column was successfully removed