-- Enable pg_cron and pg_net extensions in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a schema-private function to run the rates update HTTP call
CREATE OR REPLACE FUNCTION public.trigger_currency_rates_update()
RETURNS void AS $$
DECLARE
  app_url text;
  cron_secret text;
BEGIN
  -- Attempt to get the configured app URL or default to localhost:3000
  app_url := COALESCE(
    current_setting('app.settings.url', true),
    'localhost:3000'
  );
  
  -- Attempt to get the configured CRON secret or default to 'default_secret'
  cron_secret := COALESCE(
    current_setting('app.settings.cron_secret', true),
    'default_secret'
  );

  -- Perform an asynchronous HTTP GET request to our Next.js API cron route
  PERFORM net.http_get(
    url := 'http://' || app_url || '/api/cron/update-rates',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run daily at midnight
SELECT cron.schedule(
  'daily-currency-rates-update',
  '0 0 * * *',
  $$ SELECT public.trigger_currency_rates_update(); $$
);
