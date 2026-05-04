-- Quote status column + demo-coti source tracking.
-- Apply after 001–015.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS email_sent_to TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);

COMMENT ON COLUMN quotes.status IS
  'Estado de la cotización: draft | sent | confirmed | completed. NULL en quotes importadas históricamente.';

COMMENT ON COLUMN quotes.email_sent_to IS
  'Email al que se envió la cotización (si corresponde).';
