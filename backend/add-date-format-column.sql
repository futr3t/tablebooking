-- Add date_format column to restaurants table
-- This allows restaurants to configure their preferred date format (UK vs US)

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS date_format VARCHAR(2) DEFAULT 'uk' CHECK (date_format IN ('uk', 'us'));

-- Add a comment to document the column
COMMENT ON COLUMN restaurants.date_format IS 'Date format preference: uk (dd/MM/yyyy) or us (MM/dd/yyyy)';