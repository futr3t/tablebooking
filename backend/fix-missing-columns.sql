-- Emergency fix for missing database columns
-- This script adds only the critical missing columns that are causing 500 errors

-- Add missing columns to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS max_covers INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS turn_time_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS stagger_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS default_slot_duration INTEGER DEFAULT 30;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name IN ('max_covers', 'turn_time_minutes', 'stagger_minutes', 'default_slot_duration')
ORDER BY column_name;

-- Check if any restaurants need default values
SELECT id, name, max_covers, turn_time_minutes, stagger_minutes, default_slot_duration
FROM restaurants
WHERE turn_time_minutes IS NULL OR default_slot_duration IS NULL;