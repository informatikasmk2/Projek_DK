-- Change FK constraints from ON DELETE CASCADE to ON DELETE SET NULL
-- so that deleting a customer does NOT delete their transactions (repairs)
-- or devices. Repairs and devices will keep their rows with customer_id set to NULL.

-- Make repairs.customer_id nullable
ALTER TABLE repairs ALTER COLUMN customer_id DROP NOT NULL;

-- Replace the FK on repairs.customer_id
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_customer_id_fkey;
ALTER TABLE repairs ADD CONSTRAINT repairs_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Make devices.customer_id nullable
ALTER TABLE devices ALTER COLUMN customer_id DROP NOT NULL;

-- Replace the FK on devices.customer_id
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_customer_id_fkey;
ALTER TABLE devices ADD CONSTRAINT devices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
