-- Migration: Update source check constraint on public.expenses to allow OCR_RECEIPT
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_source_check CHECK (source IN ('MANUAL', 'MESSAGE', 'OCR', 'EMAIL', 'SMS', 'OCR_RECEIPT'));

-- Add currency column to public.receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL;
