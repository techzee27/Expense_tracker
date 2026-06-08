import { z } from 'zod';

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export const createExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3, 'Must be a 3-letter currency code (e.g. USD)'),
  toCurrency: z.string().length(3, 'Must be a 3-letter currency code (e.g. EUR)'),
  rate: z.number().positive('Conversion rate must be greater than zero'),
});

export type CreateExchangeRateDTO = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateDTO = Partial<CreateExchangeRateDTO>;
