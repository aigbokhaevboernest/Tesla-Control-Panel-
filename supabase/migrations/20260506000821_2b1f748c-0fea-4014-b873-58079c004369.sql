
-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS total_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_expert_id uuid;

-- Backfill from existing columns
UPDATE public.profiles SET total_balance = COALESCE(balance, 0) WHERE total_balance = 0;
UPDATE public.profiles SET deposit = COALESCE(deposit_balance, 0) WHERE deposit = 0;
UPDATE public.profiles SET profit = COALESCE(profit_balance, 0) WHERE profit = 0;
UPDATE public.profiles SET assigned_expert_id = assigned_trader_id WHERE assigned_expert_id IS NULL;

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  method text,
  proof_url text,
  wallet_address text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
CREATE POLICY "Users insert own transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage transactions select" ON public.transactions;
CREATE POLICY "Admins manage transactions select" ON public.transactions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage transactions update" ON public.transactions;
CREATE POLICY "Admins manage transactions update" ON public.transactions
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage transactions delete" ON public.transactions;
CREATE POLICY "Admins manage transactions delete" ON public.transactions
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Expert traders
CREATE TABLE IF NOT EXISTS public.expert_traders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  handle text NOT NULL,
  avatar_url text,
  specialty text NOT NULL,
  win_rate numeric NOT NULL DEFAULT 0,
  total_profit_usd numeric NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0,
  min_copy_amount numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_traders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone view experts" ON public.expert_traders;
CREATE POLICY "Anyone view experts" ON public.expert_traders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert experts" ON public.expert_traders;
CREATE POLICY "Admins insert experts" ON public.expert_traders
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update experts" ON public.expert_traders;
CREATE POLICY "Admins update experts" ON public.expert_traders
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete experts" ON public.expert_traders;
CREATE POLICY "Admins delete experts" ON public.expert_traders
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Disable RLS on kyc_submissions per request
ALTER TABLE public.kyc_submissions DISABLE ROW LEVEL SECURITY;
