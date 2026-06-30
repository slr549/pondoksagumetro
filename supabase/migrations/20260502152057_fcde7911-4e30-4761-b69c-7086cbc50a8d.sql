ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_token text,
  ADD COLUMN IF NOT EXISTS payment_order_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_orders_payment_order_id ON public.orders(payment_order_id);