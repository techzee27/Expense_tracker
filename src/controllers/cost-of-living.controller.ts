'use server';

import { costOfLivingService } from '@/services/cost-of-living.service';

export async function searchLocationsAction(query: string) {
  try {
    const results = await costOfLivingService.searchLocations(query);
    return {
      success: true,
      data: results,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search locations',
    };
  }
}

export async function getLocationCostDetailsAction(city: string, country: string) {
  try {
    const details = await costOfLivingService.getCostOfLivingDetails(city, country);
    return {
      success: true,
      data: details,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve cost details',
    };
  }
}

export async function getUniqueCountriesAction() {
  try {
    const results = await costOfLivingService.getUniqueCountries();
    return {
      success: true,
      data: results,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve countries',
    };
  }
}

export async function getCitiesByCountryAction(country: string) {
  try {
    const results = await costOfLivingService.getCitiesByCountry(country);
    return {
      success: true,
      data: results,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve cities',
    };
  }
}
