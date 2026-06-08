'use server';

import { currencyService } from '@/services/currency.service';
import {
  convertCurrencySchema,
  getRatesSchema,
  SupportedCurrency
} from '@/models/currency.model';

export async function convertCurrencyAction(payload: unknown) {
  try {
    const validated = convertCurrencySchema.parse(payload);
    const result = await currencyService.convert(validated);
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during currency conversion',
    };
  }
}

export async function getLatestRatesAction(baseCurrency: string) {
  try {
    const validated = getRatesSchema.parse({ baseCurrency });
    const result = await currencyService.getLatestRates(validated.baseCurrency as SupportedCurrency);
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve latest currency rates',
    };
  }
}
