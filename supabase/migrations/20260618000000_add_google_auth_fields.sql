-- Migration: Add Google auth fields to profiles table and update handle_new_user trigger
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'EMAIL',
ADD COLUMN IF NOT EXISTS google_connected BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the handle_new_user trigger function to populate auth_provider and google_connected
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_google BOOLEAN;
BEGIN
  is_google := (NEW.raw_app_meta_data->>'provider' = 'google') OR (NEW.raw_user_meta_data->>'iss' LIKE '%google%');

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    auth_provider,
    google_connected
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE WHEN is_google THEN 'GOOGLE' ELSE 'EMAIL' END,
    is_google
  )
  ON CONFLICT (id) DO UPDATE
  SET
    auth_provider = EXCLUDED.auth_provider,
    google_connected = EXCLUDED.google_connected,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
