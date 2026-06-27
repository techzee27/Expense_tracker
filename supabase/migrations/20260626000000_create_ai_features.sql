-- Migration: Create tables for Hindsight memories and AI decision audit logs

-- 1. Hindsight memories table
CREATE TABLE IF NOT EXISTS public.hindsight_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- spending_behavior, merchant_preference, budget_behavior, etc.
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on user_id and category for quick lookup
CREATE INDEX IF NOT EXISTS idx_hindsight_memories_user_category ON public.hindsight_memories(user_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hindsight_memories_user_cat_key ON public.hindsight_memories(user_id, category, key);

-- Enable RLS on hindsight_memories
ALTER TABLE public.hindsight_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" ON public.hindsight_memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON public.hindsight_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON public.hindsight_memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON public.hindsight_memories
  FOR DELETE USING (auth.uid() = user_id);


-- 2. AI audit logs table
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  task_type VARCHAR(100) NOT NULL, -- chat, budget_coaching, forecasting, etc.
  selected_model VARCHAR(100) NOT NULL,
  reason_for_selection TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  estimated_cost NUMERIC(10, 6) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT NULL
);

-- Index on user_id for auditing
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user ON public.ai_audit_logs(user_id);

-- Enable RLS on ai_audit_logs
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" ON public.ai_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON public.ai_audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
