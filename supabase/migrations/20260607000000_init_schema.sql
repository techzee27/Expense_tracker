-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated_at trigger helper function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  university TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Safely set update trigger for profiles
DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 2. EXPENSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying user expenses quickly
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
-- Index for date filtering
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Safely set update trigger for expenses
DROP TRIGGER IF EXISTS set_timestamp_expenses ON public.expenses;
CREATE TRIGGER set_timestamp_expenses
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 3. BUDGETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_category_date_range UNIQUE (user_id, category, start_date, end_date)
);

-- Index for querying budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

-- Safely set update trigger for budgets
DROP TRIGGER IF EXISTS set_timestamp_budgets ON public.budgets;
CREATE TRIGGER set_timestamp_budgets
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 4. SAVINGS GOALS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying savings goals
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);

-- Safely set update trigger for savings goals
DROP TRIGGER IF EXISTS set_timestamp_savings_goals ON public.savings_goals;
CREATE TRIGGER set_timestamp_savings_goals
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 5. EXCHANGE RATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(12, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_currency_pair UNIQUE (from_currency, to_currency)
);

-- Index for querying currency pairs
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON public.exchange_rates(from_currency, to_currency);

-- Safely set update trigger for exchange rates
DROP TRIGGER IF EXISTS set_timestamp_exchange_rates ON public.exchange_rates;
CREATE TRIGGER set_timestamp_exchange_rates
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 6. COST OF LIVING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cost_of_living (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  index_score NUMERIC(6, 2) NOT NULL,
  estimated_monthly_cost NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_city_country UNIQUE (city, country)
);

-- Index for quick city lookup
CREATE INDEX IF NOT EXISTS idx_cost_of_living_location ON public.cost_of_living(city, country);

-- Safely set update trigger for cost of living
DROP TRIGGER IF EXISTS set_timestamp_cost_of_living ON public.cost_of_living;
CREATE TRIGGER set_timestamp_cost_of_living
BEFORE UPDATE ON public.cost_of_living
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ==========================================
-- 7. AUTH SIGNUP TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind user creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
