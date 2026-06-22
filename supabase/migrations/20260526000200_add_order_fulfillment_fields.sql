/*
  # Add order fulfillment and logistics fields

  Orders already store payment status and delivery method. This migration adds
  the shipment layer that admins need after payment: fulfillment status,
  carrier, tracking number, tracking URL, and shipped/delivered timestamps.
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_status text NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON public.orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);

UPDATE public.orders
SET
  status = CASE
    WHEN status = 'paid' AND payment_status = 'paid' THEN 'processing'
    ELSE status
  END,
  shipping_status = CASE
    WHEN status = 'shipped' THEN 'shipped'
    WHEN status = 'completed' THEN 'delivered'
    WHEN status IN ('cancelled', 'refunded') THEN 'cancelled'
    ELSE shipping_status
  END,
  updated_at = now()
WHERE status IN ('paid', 'shipped', 'completed', 'cancelled', 'refunded');
