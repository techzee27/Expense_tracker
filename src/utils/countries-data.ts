export const COUNTRIES = [
  { name: 'India', code: 'INR', symbol: '₹', nameCurrency: 'Indian Rupee' },
  { name: 'Nepal', code: 'NPR', symbol: '₨', nameCurrency: 'Nepalese Rupee' },
  { name: 'Bangladesh', code: 'BDT', symbol: '৳', nameCurrency: 'Bangladeshi Taka' },
  { name: 'USA', code: 'USD', symbol: '$', nameCurrency: 'US Dollar' },
  { name: 'UAE', code: 'AED', symbol: 'د.إ', nameCurrency: 'UAE Dirham' },
  { name: 'Canada', code: 'CAD', symbol: 'C$', nameCurrency: 'Canadian Dollar' },
  { name: 'Australia', code: 'AUD', symbol: 'A$', nameCurrency: 'Australian Dollar' },
  { name: 'United Kingdom', code: 'GBP', symbol: '£', nameCurrency: 'British Pound' },
  { name: 'Europe', code: 'EUR', symbol: '€', nameCurrency: 'Euro' },
];

export const CITIES_MAPPING: Record<string, string[]> = {
  'India': ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'],
  'Nepal': ['Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'Bharatpur'],
  'Bangladesh': ['Dhaka', 'Chittagong', 'Khulna', 'Sylhet', 'Rajshahi'],
  'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston', 'Seattle'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Oxford'],
  'Europe': ['Paris', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Vienna', 'Dublin'],
};
