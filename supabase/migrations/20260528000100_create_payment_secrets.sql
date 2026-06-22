/*
  # Create Payment Secrets Table

  Stores encrypted payment provider secrets for WordPress-like admin setup.
  Secrets are written and read only by Supabase Edge Functions with the service
  role key. The browser never receives decrypted values.
*/

CREATE TABLE IF NOT EXISTS payment_secrets (
  provider_id     text NOT NULL,
  secret_name     text NOT NULL,
  encrypted_value text NOT NULL,
  nonce           text NOT NULL,
  masked_hint     text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, secret_name)
);

ALTER TABLE payment_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON payment_secrets FROM anon;
REVOKE ALL ON payment_secrets FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_payment_secrets_updated_at ON payment_secrets(updated_at DESC);
