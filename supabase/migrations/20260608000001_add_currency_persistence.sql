-- Add currency persistence columns to public.expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS original_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_currency varchar(3) NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate_at_entry numeric NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS converted_amount numeric NOT NULL DEFAULT 0;

-- Backfill existing database rows
UPDATE public.expenses e
SET 
  original_amount = amount,
  original_currency = COALESCE((SELECT currency FROM public.profiles p WHERE p.id = e.user_id LIMIT 1), 'USD'),
  exchange_rate_at_entry = 1.0,
  converted_amount = amount
WHERE original_amount = 0;
