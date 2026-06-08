-- Add new student profile metadata columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS study_country TEXT,
ADD COLUMN IF NOT EXISTS study_city TEXT,
ADD COLUMN IF NOT EXISTS home_country TEXT,
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
