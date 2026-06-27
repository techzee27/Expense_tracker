-- Migration: Create income and recurring schedules tables

-- 1. Recurring Income Schedules Table
CREATE TABLE IF NOT EXISTS public.recurring_income_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  category VARCHAR(50) NOT NULL,
  payer VARCHAR(100),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_execution_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying user recurring schedules
CREATE INDEX IF NOT EXISTS idx_recurring_income_user_id ON public.recurring_income_schedules(user_id);

-- Enable RLS
ALTER TABLE public.recurring_income_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for recurring schedules
DROP POLICY IF EXISTS "Users can manage own recurring schedules" ON public.recurring_income_schedules;
CREATE POLICY "Users can manage own recurring schedules" ON public.recurring_income_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Incomes Table
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  payer VARCHAR(100),
  source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'EMAIL', 'MESSAGE')),
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_schedule_id UUID REFERENCES public.recurring_income_schedules(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  sms_id TEXT NULL,
  sender_id TEXT NULL,
  payment_method TEXT NULL,
  account_reference TEXT NULL,
  transaction_time TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying user incomes
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
-- Index for date filtering
CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(transaction_date);

-- Enable RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Policies for incomes
DROP POLICY IF EXISTS "Users can manage own incomes" ON public.incomes;
CREATE POLICY "Users can manage own incomes" ON public.incomes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_timestamp_recurring_income_schedules ON public.recurring_income_schedules;
CREATE TRIGGER set_timestamp_recurring_income_schedules
BEFORE UPDATE ON public.recurring_income_schedules
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_incomes ON public.incomes;
CREATE TRIGGER set_timestamp_incomes
BEFORE UPDATE ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
