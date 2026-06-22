/*
  # Ensure payment_secrets exists

  Some remote projects already marked the original migration as applied while the
  table was missing. This migration is intentionally idempotent.
*/

CREATE TABLE IF NOT EXISTS public.payment_secrets (
  provider_id     text NOT NULL,
  secret_name     text NOT NULL,
  encrypted_value text NOT NULL,
  nonce           text NOT NULL,
  masked_hint     text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, secret_name)
);

ALTER TABLE public.payment_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_secrets FROM anon;
REVOKE ALL ON public.payment_secrets FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_payment_secrets_updated_at ON public.payment_secrets(updated_at DESC);
