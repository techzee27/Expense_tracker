-- Migration: Add Gmail OAuth columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS connected_email TEXT NULL,
ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT NULL,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT NULL,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TEXT NULL;
