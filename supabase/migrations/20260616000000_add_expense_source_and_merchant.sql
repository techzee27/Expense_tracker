-- Migration: Add source, merchant, receipt, and confidence columns to public.expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'MESSAGE', 'OCR', 'BANK_SYNC')),
ADD COLUMN IF NOT EXISTS merchant VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS receipt_filename TEXT NULL,
ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL,
ADD COLUMN IF NOT EXISTS ocr_confidence INTEGER NULL;

-- Backfill existing database rows to MANUAL
UPDATE public.expenses
SET source = 'MANUAL'
WHERE source IS NULL OR source = '';
