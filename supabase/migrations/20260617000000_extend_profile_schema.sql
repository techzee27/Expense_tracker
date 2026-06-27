-- Migration: Extend profiles schema with tracking preferences and transaction counts
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_of_study TEXT NULL,
ADD COLUMN IF NOT EXISTS city_of_study TEXT NULL,
ADD COLUMN IF NOT EXISTS preferred_currency TEXT NULL,
ADD COLUMN IF NOT EXISTS sms_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_sms_sync TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS last_email_sync TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS sms_imported_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_imported_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_imported_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_transaction_count INTEGER NOT NULL DEFAULT 0;

-- Backfill legacy records to keep data in sync
UPDATE public.profiles
SET 
  country_of_study = COALESCE(country_of_study, study_country),
  city_of_study = COALESCE(city_of_study, study_city),
  preferred_currency = COALESCE(preferred_currency, currency);
