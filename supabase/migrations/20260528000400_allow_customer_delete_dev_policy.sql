/*
  # Allow admin dashboard customer deletes in dev/test mode

  The project uses the custom public.users table with anon dashboard access in
  development. CustomerManagement only deletes customer rows that have no orders
  or address records, and this policy lets that final delete reach the database.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Anon can delete customer users (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can delete customer users (dev/test)" ON public.users FOR DELETE TO anon USING (role = ''customer'')';
  END IF;
END $$;
