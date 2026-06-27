-- Migration: Extend public.expenses with import workflow fields
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS duplicate_flag BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS email_confidence INTEGER NULL;

-- Ensure all current historical rows are marked as approved
UPDATE public.expenses
SET approved = TRUE
WHERE approved IS NULL;
