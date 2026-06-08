-- Migration to create normalized cost_of_living table with all 55 categories
DROP TABLE IF EXISTS public.cost_of_living CASCADE;

CREATE TABLE IF NOT EXISTS public.cost_of_living (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  
  -- Cost Categories
  meal_inexpensive_restaurant NUMERIC(12, 2),
  meal_mid_range_restaurant NUMERIC(12, 2),
  mcmeal_mcdonalds NUMERIC(12, 2),
  domestic_beer_draught NUMERIC(12, 2),
  imported_beer_draught NUMERIC(12, 2),
  coke_pepsi_bottle NUMERIC(12, 2),
  water_033_liter_bottle NUMERIC(12, 2),
  milk_1_liter NUMERIC(12, 2),
  bread_500g NUMERIC(12, 2),
  eggs_12 NUMERIC(12, 2),
  cheese_1kg NUMERIC(12, 2),
  water_15_bottle NUMERIC(12, 2),
  wine_bottle NUMERIC(12, 2),
  domestic_beer_bottle NUMERIC(12, 2),
  imported_beer_bottle NUMERIC(12, 2),
  cigarettes_marlboro NUMERIC(12, 2),
  one_way_ticket_transport NUMERIC(12, 2),
  chicken_breasts_1kg NUMERIC(12, 2),
  monthly_pass_transport NUMERIC(12, 2),
  gasoline_1_liter NUMERIC(12, 2),
  volkswagen_golf NUMERIC(12, 2),
  apartment_1bed_city_centre NUMERIC(12, 2),
  apartment_1bed_outside_centre NUMERIC(12, 2),
  apartment_3bed_city_centre NUMERIC(12, 2),
  apartment_3bed_outside_centre NUMERIC(12, 2),
  utilities_basic_apartment NUMERIC(12, 2),
  mobile_tariff_minute NUMERIC(12, 2),
  internet_unlimited NUMERIC(12, 2),
  fitness_club_monthly NUMERIC(12, 2),
  tennis_court_hourly NUMERIC(12, 2),
  cinema_ticket NUMERIC(12, 2),
  jeans_levis NUMERIC(12, 2),
  summer_dress_chain_store NUMERIC(12, 2),
  nike_shoes NUMERIC(12, 2),
  men_leather_shoes NUMERIC(12, 2),
  sqm_price_city_centre NUMERIC(12, 2),
  sqm_price_outside_centre NUMERIC(12, 2),
  average_salary_net NUMERIC(12, 2),
  mortgage_interest_rate NUMERIC(12, 2),
  taxi_start NUMERIC(12, 2),
  taxi_1km NUMERIC(12, 2),
  taxi_waiting_1hour NUMERIC(12, 2),
  apples_1kg NUMERIC(12, 2),
  oranges_1kg NUMERIC(12, 2),
  potato_1kg NUMERIC(12, 2),
  lettuce_head NUMERIC(12, 2),
  cappuccino NUMERIC(12, 2),
  rice_1kg NUMERIC(12, 2),
  tomato_1kg NUMERIC(12, 2),
  banana_1kg NUMERIC(12, 2),
  onion_1kg NUMERIC(12, 2),
  beef_round_1kg NUMERIC(12, 2),
  toyota_corolla NUMERIC(12, 2),
  preschool_monthly NUMERIC(12, 2),
  primary_school_yearly NUMERIC(12, 2),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_col_city_country UNIQUE (city, country)
);

-- Search optimization indexes
CREATE INDEX IF NOT EXISTS idx_cost_of_living_city ON public.cost_of_living (city);
CREATE INDEX IF NOT EXISTS idx_cost_of_living_country ON public.cost_of_living (country);

-- Set updated_at trigger helper binding
DROP TRIGGER IF EXISTS set_timestamp_cost_of_living ON public.cost_of_living;
CREATE TRIGGER set_timestamp_cost_of_living
BEFORE UPDATE ON public.cost_of_living
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
