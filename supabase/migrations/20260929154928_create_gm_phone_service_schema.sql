/*
# GM Phone Service - Database Schema

## Overview
Creates the complete schema for the GM Phone Service app — a phone repair cashier
and management system. Single-tenant (no auth), all data is shared/public.

## New Tables

### customers
- id (uuid, PK)
- name (text, required)
- phone (text, required)
- created_at (timestamptz)

### devices
- id (uuid, PK)
- customer_id (uuid, FK → customers)
- brand (text, required)
- model (text, required)
- imei (text, optional)
- color (text, optional)
- created_at (timestamptz)

### repairs
- id (uuid, PK)
- invoice_number (text, unique, required)
- customer_id (uuid, FK → customers)
- device_id (uuid, FK → devices)
- damage_type (text, required)
- damage_description (text, optional)
- sparepart_name (text, optional)
- technician_note (text, optional)
- customer_note (text, optional)
- status (text, required, default 'menunggu')
- risk_level (text, required)
- risk_multiplier (numeric, required)
- installation_fee (numeric, required)
- cost_price (numeric, required)
- sparepart_price (numeric, required)
- rounding (numeric, default 0)
- total_price (numeric, required)
- warranty_days (integer, default 0)
- warranty_start (date, optional)
- warranty_end (date, optional)
- created_at (timestamptz)
- updated_at (timestamptz)

### settings
- id (uuid, PK)
- store_name (text)
- address (text)
- phone (text)
- whatsapp (text)
- footer (text)
- logo (text, base64 data URL)

### pricing_settings
- id (uuid, PK)
- risk_level (text, unique)
- multiplier (numeric)
- installation_fee (numeric)

## Security
- RLS enabled on all tables.
- All tables allow anon + authenticated full CRUD (single-tenant, no auth).
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  imei text,
  color text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_devices" ON devices;
CREATE POLICY "anon_select_devices" ON devices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_devices" ON devices;
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_devices" ON devices;
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_devices" ON devices;
CREATE POLICY "anon_delete_devices" ON devices FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  damage_type text NOT NULL,
  damage_description text,
  sparepart_name text,
  technician_note text,
  customer_note text,
  status text NOT NULL DEFAULT 'menunggu',
  risk_level text NOT NULL,
  risk_multiplier numeric NOT NULL,
  installation_fee numeric NOT NULL,
  cost_price numeric NOT NULL,
  sparepart_price numeric NOT NULL,
  rounding numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL,
  warranty_days integer NOT NULL DEFAULT 0,
  warranty_start date,
  warranty_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repairs" ON repairs;
CREATE POLICY "anon_select_repairs" ON repairs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repairs" ON repairs;
CREATE POLICY "anon_insert_repairs" ON repairs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repairs" ON repairs;
CREATE POLICY "anon_update_repairs" ON repairs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repairs" ON repairs;
CREATE POLICY "anon_delete_repairs" ON repairs FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text DEFAULT 'GM Phone Service',
  address text DEFAULT '',
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  footer text DEFAULT 'Terima kasih telah mempercayakan HP Anda kepada kami.',
  logo text DEFAULT ''
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_level text UNIQUE NOT NULL,
  multiplier numeric NOT NULL,
  installation_fee numeric NOT NULL
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pricing" ON pricing_settings;
CREATE POLICY "anon_select_pricing" ON pricing_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pricing" ON pricing_settings;
CREATE POLICY "anon_insert_pricing" ON pricing_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pricing" ON pricing_settings;
CREATE POLICY "anon_update_pricing" ON pricing_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pricing" ON pricing_settings;
CREATE POLICY "anon_delete_pricing" ON pricing_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default pricing
INSERT INTO pricing_settings (risk_level, multiplier, installation_fee) VALUES
  ('ringan', 1.5, 50000),
  ('sedang', 1.65, 100000),
  ('sulit', 1.8, 150000)
ON CONFLICT (risk_level) DO NOTHING;

-- Seed default settings
INSERT INTO settings (store_name, address, phone, whatsapp, footer, logo)
SELECT 'GM Phone Service', '', '', '', 'Terima kasih telah mempercayakan HP Anda kepada kami.', ''
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_repairs_created_at ON repairs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_repairs_customer_id ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);