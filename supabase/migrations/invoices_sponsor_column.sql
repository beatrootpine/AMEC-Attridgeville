-- Add sponsor_registration_id column to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sponsor_registration_id uuid REFERENCES sponsor_registrations(id) ON DELETE CASCADE;

-- Add complimentary status
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('unpaid', 'paid', 'cancelled', 'complimentary'));
