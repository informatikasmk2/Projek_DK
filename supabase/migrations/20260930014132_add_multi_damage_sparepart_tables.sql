/*
# Add multi-damage and multi-sparepart support

## Overview
Refactors the repairs schema to support multiple damages and multiple sparepart items
per repair. Previously the repairs table stored a single damage_type and single
sparepart pricing. This migration adds two new child tables and migrates existing data.

## New Tables

### repair_damages
- id (uuid, PK)
- repair_id (uuid, FK → repairs, ON DELETE CASCADE)
- description (text, required)
- created_at (timestamptz)

### repair_items
- id (uuid, PK)
- repair_id (uuid, FK → repairs, ON DELETE CASCADE)
- sparepart_name (text, required)
- cost_price (numeric, required)
- risk_level (text, required)
- risk_multiplier (numeric, required)
- selling_price (numeric, required) — cost_price × risk_multiplier
- installation_fee (numeric, required)
- subtotal (numeric, required) — selling_price + installation_fee
- created_at (timestamptz)

## Modified Tables

### repairs
- Added total_sparepart (numeric, default 0) — sum of all selling_price
- Added total_service (numeric, default 0) — sum of all installation_fee
- Kept existing columns (damage_type, cost_price, etc.) for backward compatibility

## Data Migration
- For each existing repair, the single damage_type is migrated to repair_damages.
- For each existing repair with a sparepart, the pricing is migrated to repair_items.
- total_sparepart and total_service are computed from the existing sparepart_price
  and installation_fee columns.

## Security
- RLS enabled on both new tables with full anon/authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS repair_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE repair_damages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repair_damages" ON repair_damages;
CREATE POLICY "anon_select_repair_damages" ON repair_damages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repair_damages" ON repair_damages;
CREATE POLICY "anon_insert_repair_damages" ON repair_damages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repair_damages" ON repair_damages;
CREATE POLICY "anon_update_repair_damages" ON repair_damages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repair_damages" ON repair_damages;
CREATE POLICY "anon_delete_repair_damages" ON repair_damages FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS repair_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  sparepart_name text NOT NULL,
  cost_price numeric NOT NULL,
  risk_level text NOT NULL,
  risk_multiplier numeric NOT NULL,
  selling_price numeric NOT NULL,
  installation_fee numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE repair_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repair_items" ON repair_items;
CREATE POLICY "anon_select_repair_items" ON repair_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repair_items" ON repair_items;
CREATE POLICY "anon_insert_repair_items" ON repair_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repair_items" ON repair_items;
CREATE POLICY "anon_update_repair_items" ON repair_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repair_items" ON repair_items;
CREATE POLICY "anon_delete_repair_items" ON repair_items FOR DELETE
  TO anon, authenticated USING (true);

-- Add new columns to repairs table
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS total_sparepart numeric NOT NULL DEFAULT 0;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS total_service numeric NOT NULL DEFAULT 0;

-- Migrate existing damage_type to repair_damages
INSERT INTO repair_damages (repair_id, description)
SELECT id, damage_type FROM repairs
WHERE damage_type IS NOT NULL AND damage_type != ''
AND NOT EXISTS (SELECT 1 FROM repair_damages WHERE repair_damages.repair_id = repairs.id);

-- Migrate existing sparepart to repair_items
INSERT INTO repair_items (repair_id, sparepart_name, cost_price, risk_level, risk_multiplier, selling_price, installation_fee, subtotal)
SELECT
  r.id,
  COALESCE(r.sparepart_name, 'Sparepart'),
  r.cost_price,
  r.risk_level,
  r.risk_multiplier,
  r.sparepart_price,
  r.installation_fee,
  r.total_price
FROM repairs r
WHERE r.cost_price > 0
AND NOT EXISTS (SELECT 1 FROM repair_items WHERE repair_items.repair_id = r.id);

-- Compute totals for existing repairs
UPDATE repairs SET
  total_sparepart = subq.total_sparepart,
  total_service = subq.total_service
FROM (
  SELECT
    r.id AS repair_id,
    COALESCE(SUM(ri.selling_price), r.sparepart_price) AS total_sparepart,
    COALESCE(SUM(ri.installation_fee), r.installation_fee) AS total_service
  FROM repairs r
  LEFT JOIN repair_items ri ON ri.repair_id = r.id
  GROUP BY r.id, r.sparepart_price, r.installation_fee
) subq
WHERE repairs.id = subq.repair_id;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repair_damages_repair_id ON repair_damages(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_items_repair_id ON repair_items(repair_id);
