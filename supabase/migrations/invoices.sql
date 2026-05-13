-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES registrations(id) ON DELETE CASCADE UNIQUE,
  invoice_number text UNIQUE NOT NULL,
  amount_due numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  due_date date,
  paid_at timestamptz,
  reminder_count int NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate invoice number: AMEC-YYYY-NNNN
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1001;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.invoice_number := 'AMEC-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read own invoice" ON invoices FOR SELECT USING (true);
CREATE POLICY "Auth insert invoice" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update invoice" ON invoices FOR UPDATE USING (true);

-- pg_cron: daily reminder job (run this separately in Supabase SQL editor after enabling pg_cron extension)
-- SELECT cron.schedule('daily-invoice-reminders', '0 8 * * *', $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminder',
--     headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
-- $$);
