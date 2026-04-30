-- Withdrawal bank info (admin-managed, shown to users)
CREATE TABLE public.withdrawal_bank_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_bank_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bank info"
  ON public.withdrawal_bank_info FOR SELECT
  TO authenticated
  USING (is_active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage bank info insert"
  ON public.withdrawal_bank_info FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage bank info update"
  ON public.withdrawal_bank_info FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage bank info delete"
  ON public.withdrawal_bank_info FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Account codes (per user, admin-generated)
CREATE TABLE public.account_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  auth_code text,
  cot_code text,
  tax_code text,
  auth_required boolean NOT NULL DEFAULT false,
  cot_required boolean NOT NULL DEFAULT false,
  tax_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage codes select"
  ON public.account_codes FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own code requirements"
  ON public.account_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins insert codes"
  ON public.account_codes FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update codes"
  ON public.account_codes FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete codes"
  ON public.account_codes FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Email log (records when admin opted to send email)
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text NOT NULL,
  body text,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email log"
  ON public.email_log FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert email log"
  ON public.email_log FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_bank_info_updated BEFORE UPDATE ON public.withdrawal_bank_info
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_account_codes_updated BEFORE UPDATE ON public.account_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();