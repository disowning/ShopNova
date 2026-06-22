/*
  # Google Login Fields

  Adds optional Google account binding fields to the custom dev/test users table.
*/

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'password',
  ADD COLUMN IF NOT EXISTS google_sub text,
  ADD COLUMN IF NOT EXISTS google_email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users(google_sub)
  WHERE google_sub IS NOT NULL;
