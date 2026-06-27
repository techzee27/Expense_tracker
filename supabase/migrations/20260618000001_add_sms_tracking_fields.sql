-- Migration: Add SMS tracking columns and update constraints for SMS imports

-- Update profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sms_permission_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
ADD COLUMN IF NOT EXISTS sms_messages_scanned INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sms_scan TIMESTAMPTZ NULL;

-- Update expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS sms_id TEXT NULL,
ADD COLUMN IF NOT EXISTS sender_id TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_method TEXT NULL,
ADD COLUMN IF NOT EXISTS account_reference TEXT NULL,
ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ NULL;

-- Drop the old check constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_check;

-- Add the new check constraint allowing 'SMS'
ALTER TABLE public.expenses ADD CONSTRAINT expenses_source_check CHECK (source IN ('MANUAL', 'MESSAGE', 'OCR', 'EMAIL', 'SMS'));
