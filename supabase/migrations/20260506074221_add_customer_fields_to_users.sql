/*
  # Add customer management fields to users table

  1. Modified Tables
    - `users`
      - `country` (text) - customer's country code
      - `member_level` (text) - membership tier: '新用户', '普通', 'VIP', '高级VIP'
      - `status` (text) - account status: '活跃', '待验证', '已封禁'
      - `total_spend` (numeric) - cumulative spend amount
      - `order_count` (integer) - total number of orders placed
      - `last_order_at` (timestamptz) - timestamp of most recent order

  2. Notes
    - All new columns are nullable with sensible defaults
    - Existing rows get default values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.users ADD COLUMN country text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'member_level'
  ) THEN
    ALTER TABLE public.users ADD COLUMN member_level text DEFAULT '新用户';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN status text DEFAULT '活跃';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'total_spend'
  ) THEN
    ALTER TABLE public.users ADD COLUMN total_spend numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'order_count'
  ) THEN
    ALTER TABLE public.users ADD COLUMN order_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_order_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_order_at timestamptz;
  END IF;
END $$;
