-- Create public.goal_allocations table
CREATE TABLE IF NOT EXISTS public.goal_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  allocation_date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'MONTHLY_SAVINGS' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying allocations by goal
CREATE INDEX IF NOT EXISTS idx_goal_allocations_goal_id ON public.goal_allocations(goal_id);

-- Enable trigger for set timestamp
DROP TRIGGER IF EXISTS set_timestamp_goal_allocations ON public.goal_allocations;
CREATE TRIGGER set_timestamp_goal_allocations
BEFORE UPDATE ON public.goal_allocations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
