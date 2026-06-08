-- Enable Row Level Security (RLS) on all user-facing tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_of_living ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. PROFILES POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==========================================
-- 2. EXPENSES POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. BUDGETS POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. SAVINGS GOALS POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can manage own savings goals" ON public.savings_goals;
CREATE POLICY "Users can manage own savings goals" ON public.savings_goals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 5. EXCHANGE RATES POLICIES (Global read)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read on exchange rates" ON public.exchange_rates;
CREATE POLICY "Allow authenticated read on exchange rates" ON public.exchange_rates
  FOR SELECT TO authenticated USING (true);

-- ==========================================
-- 6. COST OF LIVING POLICIES (Global read)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read on cost of living data" ON public.cost_of_living;
CREATE POLICY "Allow authenticated read on cost of living data" ON public.cost_of_living
  FOR SELECT TO authenticated USING (true);
