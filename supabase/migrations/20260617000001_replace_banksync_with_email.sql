-- Migration: Replace BANK_SYNC with EMAIL in public.expenses
-- First, update any existing records
UPDATE public.expenses
SET source = 'EMAIL'
WHERE source = 'BANK_SYNC';

-- Drop the old check constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_check;

-- Add the new check constraint
ALTER TABLE public.expenses ADD CONSTRAINT expenses_source_check CHECK (source IN ('MANUAL', 'MESSAGE', 'OCR', 'EMAIL'));
