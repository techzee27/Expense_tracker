-- Migration: Add show_home_currency setting to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_home_currency BOOLEAN NOT NULL DEFAULT TRUE;
