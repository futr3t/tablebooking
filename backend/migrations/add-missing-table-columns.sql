-- Migration: Add missing columns to tables table
-- Date: 2025-07-03
-- Description: Add missing columns that are expected by the TableModel

-- Add missing columns to tables table
ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE tables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS location_notes VARCHAR(255);
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_combinable BOOLEAN DEFAULT true;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Update existing tables with default values
UPDATE tables SET 
  table_type = 'standard' 
WHERE table_type IS NULL;

UPDATE tables SET 
  is_accessible = false 
WHERE is_accessible IS NULL;

UPDATE tables SET 
  is_combinable = true 
WHERE is_combinable IS NULL;

UPDATE tables SET 
  priority = 0 
WHERE priority IS NULL;

-- Add helpful comments
COMMENT ON COLUMN tables.table_type IS 'Type of table: standard, booth, bar, high_top, patio, private';
COMMENT ON COLUMN tables.notes IS 'Additional notes about the table';
COMMENT ON COLUMN tables.location_notes IS 'Location description for the table';
COMMENT ON COLUMN tables.is_accessible IS 'Whether the table is wheelchair accessible';
COMMENT ON COLUMN tables.is_combinable IS 'Whether the table can be combined with others';
COMMENT ON COLUMN tables.priority IS 'Higher priority tables are preferred for booking';

-- Create index on table_type for performance
CREATE INDEX IF NOT EXISTS idx_tables_table_type ON tables(table_type);
CREATE INDEX IF NOT EXISTS idx_tables_is_accessible ON tables(is_accessible);
CREATE INDEX IF NOT EXISTS idx_tables_priority ON tables(priority);

-- Migration completed successfully