-- Salespeople (vendedores / sales reps that sign quotes) + FK from quotes.
-- Apply after 001–010.

CREATE TABLE IF NOT EXISTS salespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salespeople_email ON salespeople (email);

COMMENT ON TABLE salespeople IS
  'Salespeople (vendedores) that appear on the PDF signature of a quote.';

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespeople(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quotes_salesperson_id ON quotes (salesperson_id);

COMMENT ON COLUMN quotes.salesperson_id IS
  'Salesperson (vendedor) assigned to the quote (FK salespeople.id).';

-- Seed of the default salesperson (idempotent by email).
INSERT INTO salespeople (name, email)
VALUES ('Mariela Gherghi', 'mariela@latampettransport.com')
ON CONFLICT (email) DO NOTHING;
