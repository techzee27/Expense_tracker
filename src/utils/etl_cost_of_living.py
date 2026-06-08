import csv
import re
import os

# Define clean column name mapping for all 55 categories in the dataset
CATEGORY_COLUMN_MAP = {
    "Meal, Inexpensive Restaurant": "meal_inexpensive_restaurant",
    "Meal for 2 People, Mid-range Restaurant, Three-course": "meal_mid_range_restaurant",
    "McMeal at McDonalds (or Equivalent Combo Meal)": "mcmeal_mcdonalds",
    "Domestic Beer (0.5 liter draught)": "domestic_beer_draught",
    "Imported Beer (0.33 liter bottle)": "imported_beer_draught", # Note: column 6 is imported beer (0.33 bottle) in restaurants
    "Coke/Pepsi (0.33 liter bottle)": "coke_pepsi_bottle",
    "Water (0.33 liter bottle) ": "water_033_bottle",
    "Milk (regular), (1 liter)": "milk_1_liter",
    "Loaf of Fresh White Bread (500g)": "bread_500g",
    "Eggs (regular) (12)": "eggs_12",
    "Local Cheese (1kg)": "cheese_1kg",
    "Water (1.5 liter bottle)": "water_15_bottle",
    "Bottle of Wine (Mid-Range)": "wine_bottle",
    "Domestic Beer (0.5 liter bottle)": "domestic_beer_bottle",
    "Imported Beer (0.33 liter bottle)": "imported_beer_bottle", # Note: column 16 is imported beer bottle
    "Cigarettes 20 Pack (Marlboro)": "cigarettes_marlboro",
    "One-way Ticket (Local Transport)": "one_way_ticket_transport",
    "Chicken Breasts (Boneless, Skinless), (1kg)": "chicken_breasts_1kg",
    "Monthly Pass (Regular Price)": "monthly_pass_transport",
    "Gasoline (1 liter)": "gasoline_1_liter",
    "Volkswagen Golf": "volkswagen_golf",
    "Apartment (1 bedroom) in City Centre": "apartment_1bed_city_centre",
    "Apartment (1 bedroom) Outside of Centre": "apartment_1bed_outside_centre",
    "Apartment (3 bedrooms) in City Centre": "apartment_3bed_city_centre",
    "Apartment (3 bedrooms) Outside of Centre": "apartment_3bed_outside_centre",
    "Basic (Electricity, Heating, Cooling, Water, Garbage) for 85m2 Apartment": "utilities_basic_apartment",
    "1 min. of Prepaid Mobile Tariff Local (No Discounts or Plans)": "mobile_tariff_minute",
    "Internet (60 Mbps or More, Unlimited Data, Cable/ADSL)": "internet_unlimited",
    "Fitness Club, Monthly Fee for 1 Adult": "fitness_club_monthly",
    "Tennis Court Rent (1 Hour on Weekend)": "tennis_court_hourly",
    "Cinema, International Release, 1 Seat": "cinema_ticket",
    "1 Pair of Jeans (Levis 501 Or Similar)": "jeans_levis",
    "1 Summer Dress in a Chain Store (Zara, H&M, ...)": "summer_dress_chain_store",
    "1 Pair of Nike Running Shoes (Mid-Range)": "nike_shoes",
    "1 Pair of Men Leather Business Shoes": "men_leather_shoes",
    "Price per Square Meter to Buy Apartment in City Centre": "sqm_price_city_centre",
    "Price per Square Meter to Buy Apartment Outside of Centre": "sqm_price_outside_centre",
    "Average Monthly Net Salary (After Tax)": "average_salary_net",
    "Mortgage Interest Rate in Percentages (%), Yearly, for 20 Years Fixed-Rate": "mortgage_interest_rate",
    "Taxi Start (Normal Tariff)": "taxi_start",
    "Taxi 1km (Normal Tariff)": "taxi_1km",
    "Taxi 1hour Waiting (Normal Tariff)": "taxi_waiting_1hour",
    "Apples (1kg)": "apples_1kg",
    "Oranges (1kg)": "oranges_1kg",
    "Potato (1kg)": "potato_1kg",
    "Lettuce (1 head)": "lettuce_head",
    "Cappuccino (regular)": "cappuccino",
    "Rice (white), (1kg)": "rice_1kg",
    "Tomato (1kg)": "tomato_1kg",
    "Banana (1kg)": "banana_1kg",
    "Onion (1kg)": "onion_1kg",
    "Beef Round (1kg) (or Equivalent Back Leg Red Meat)": "beef_round_1kg",
    "Toyota Corolla 1.6l 97kW Comfort (Or Equivalent New Car)": "toyota_corolla",
    "Preschool (or Kindergarten), Full Day, Private, Monthly for 1 Child": "preschool_monthly",
    "International Primary School, Yearly for 1 Child": "primary_school_yearly"
}

def clean_value(val):
    if not val or val.strip() == '' or val.strip().lower() == 'null':
        return None
    try:
        return float(val)
    except ValueError:
        return None

def run_etl():
    input_file = '/Users/apple/Desktop/Expense_tracker/data/cost-of-living.csv'
    output_file = '/Users/apple/Desktop/Expense_tracker/data/cost-of-living-normalized.csv'

    print(f"Reading CSV from {input_file}...")

    with open(input_file, mode='r', encoding='utf-8') as f:
        reader = list(csv.reader(f))

    # Row 0 contains cities/countries
    locations = reader[0][1:] # Skip first cell which is empty/label
    
    # Rest of rows contain data for each category
    data_rows = reader[1:]
    
    # Store records by location index
    location_data = []
    for loc in locations:
        if not loc or loc.strip() == '':
            continue
        
        # Extract city and country
        parts = [p.strip() for p in loc.split(',')]
        if len(parts) >= 2:
            # Handle cases like "Austin, TX, United States" or "Saint Petersburg, Russia"
            country = parts[-1]
            city = ", ".join(parts[:-1])
        else:
            city = loc
            country = "Unknown"
            
        location_data.append({
            'city': city,
            'country': country,
            'costs': {}
        })

    # Read each category row and populate the location data
    unmapped = []
    for row in data_rows:
        if not row or len(row) < 2:
            continue
        
        raw_category = row[0].strip()
        # Clean quotes
        raw_category = re.sub(r'^["\']|["\']$', '', raw_category).strip()

        col_name = CATEGORY_COLUMN_MAP.get(raw_category)
        if not col_name:
            # Fallback mapper
            clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', raw_category).lower().strip()
            clean_name = re.sub(r'\s+', '_', clean_name)
            col_name = clean_name[:50]
            unmapped.append((raw_category, col_name))
            
        for i, val in enumerate(row[1:]):
            if i < len(location_data):
                location_data[i]['costs'][col_name] = clean_value(val)

    if unmapped:
        print("Warning: Some categories were not explicitly mapped and fallback was used:")
        for raw, clean in unmapped:
            print(f"  '{raw}' -> '{clean}'")

    # Generate Normalized CSV
    columns = ['city', 'country'] + sorted(list(CATEGORY_COLUMN_MAP.values()))
    
    print(f"Writing normalized CSV with {len(columns)} columns to {output_file}...")
    with open(output_file, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for loc in location_data:
            row_dict = {
                'city': loc['city'],
                'country': loc['country']
            }
            # Populate cost fields
            for col in CATEGORY_COLUMN_MAP.values():
                row_dict[col] = loc['costs'].get(col)
            writer.writerow(row_dict)

    print("ETL completed successfully!")

if __name__ == '__main__':
    run_etl()
