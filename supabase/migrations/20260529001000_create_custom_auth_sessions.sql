/*
  # Custom auth sessions

  Stores server-issued session token hashes for the custom users-table login flow.
  The browser receives only the raw token, while the database stores SHA-256 hashes.
*/

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON public.auth_sessions(expires_at);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_sessions'
      AND policyname = 'Anon can read auth_sessions'
  ) THEN
    DROP POLICY "Anon can read auth_sessions" ON public.auth_sessions;
  END IF;
END $$;
