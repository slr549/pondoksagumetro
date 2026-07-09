
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  midtrans_active boolean NOT NULL DEFAULT true,
  transfer_enabled boolean NOT NULL DEFAULT true,
  bank_name text NOT NULL DEFAULT '',
  bank_account_number text NOT NULL DEFAULT '',
  bank_account_holder text NOT NULL DEFAULT '',
  qris_image_url text,
  cod_enabled boolean NOT NULL DEFAULT true,
  cod_note text NOT NULL DEFAULT 'Bayar tunai saat pickup di Situgede.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payment settings"
  ON public.payment_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin or developer can insert payment settings"
  ON public.payment_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_dev(auth.uid()));

CREATE POLICY "Admin or developer can update payment settings"
  ON public.payment_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_dev(auth.uid()))
  WITH CHECK (public.is_admin_or_dev(auth.uid()));

CREATE POLICY "Admin or developer can delete payment settings"
  ON public.payment_settings FOR DELETE
  TO authenticated
  USING (public.is_admin_or_dev(auth.uid()));

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (midtrans_active, transfer_enabled, cod_enabled)
VALUES (true, true, true);
