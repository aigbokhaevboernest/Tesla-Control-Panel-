ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profit_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_trader_id uuid;

ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS performance_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_investment numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_generated numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.withdrawal_bank_info
  ADD COLUMN IF NOT EXISTS routing_number text,
  ADD COLUMN IF NOT EXISTS swift_code text;