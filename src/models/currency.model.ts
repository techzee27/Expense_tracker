import { z } from 'zod';

export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'CAD', 'GBP', 'EUR', 'INR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const convertCurrencySchema = z.object({
  amount: z.number({ message: 'Amount is required' })
    .positive('Amount must be greater than zero')
    .max(1000000000, 'Amount is too large'),
  fromCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: 'Invalid source currency',
  }),
  toCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: 'Invalid target currency',
  }),
});

export const getRatesSchema = z.object({
  baseCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: 'Invalid base currency',
  }),
});

export type ConvertCurrencyDTO = z.infer<typeof convertCurrencySchema>;
export type GetRatesDTO = z.infer<typeof getRatesSchema>;
