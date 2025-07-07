-- Emergency fix for missing bookings table columns
-- The BookingModel.create method expects these columns but they don't exist in production

-- Add missing columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS dietary_requirements TEXT,
ADD COLUMN IF NOT EXISTS occasion VARCHAR(100),
ADD COLUMN IF NOT EXISTS preferred_seating VARCHAR(100),
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN (
  'dietary_requirements', 'occasion', 'preferred_seating', 'marketing_consent',
  'source', 'created_by', 'is_vip', 'internal_notes', 'metadata'
)
ORDER BY column_name;

-- Check if any bookings exist to ensure no data corruption
SELECT COUNT(*) as booking_count FROM bookings;

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;