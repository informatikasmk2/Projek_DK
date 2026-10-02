-- Add store_subtitle column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_subtitle text DEFAULT 'Dashboard Servis HP';

-- Update existing settings row with default subtitle if empty
UPDATE settings SET store_subtitle = 'Dashboard Servis HP' WHERE store_subtitle IS NULL OR store_subtitle = '';
