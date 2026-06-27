-- Migration: Create recurring_expenses schema and link to expenses

-- 1. Create recurring_expenses table
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  original_amount NUMERIC(12, 2) NOT NULL,
  original_currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  exchange_rate_at_entry NUMERIC(12, 6) DEFAULT 1.000000 NOT NULL,
  converted_amount NUMERIC(12, 2) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('INCOME', 'EXPENSE')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  merchant VARCHAR(100),
  interval VARCHAR(20) NOT NULL CHECK (interval IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  last_processed_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying user recurring expenses
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON public.recurring_expenses(user_id);
-- Index for query by next_due_date
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON public.recurring_expenses(next_due_date);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for recurring_expenses
DROP POLICY IF EXISTS "Users can manage own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can manage own recurring expenses" ON public.recurring_expenses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at timestamp on recurring_expenses
DROP TRIGGER IF EXISTS set_timestamp_recurring_expenses ON public.recurring_expenses;
CREATE TRIGGER set_timestamp_recurring_expenses
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 2. Extend public.expenses with recurring attributes and update source check constraint
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;

-- Update source check constraint on public.expenses to allow RECURRING
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_source_check CHECK (source IN ('MANUAL', 'MESSAGE', 'OCR', 'EMAIL', 'SMS', 'OCR_RECEIPT', 'RECURRING'));
