import { createClient } from '@/lib/supabase/server';
import { ExchangeRate, CreateExchangeRateDTO } from '@/models/exchange-rate.model';
import { Database } from '@/types/database.types';

type DBExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];

export class ExchangeRateRepository {
  async getRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async upsert(rateData: CreateExchangeRateDTO): Promise<ExchangeRate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert(
        {
          from_currency: rateData.fromCurrency,
          to_currency: rateData.toCurrency,
          rate: rateData.rate,
        },
        { onConflict: 'from_currency,to_currency' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  private mapToDomain(dbRecord: DBExchangeRate): ExchangeRate {
    return {
      id: dbRecord.id,
      fromCurrency: dbRecord.from_currency,
      toCurrency: dbRecord.to_currency,
      rate: Number(dbRecord.rate),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const exchangeRateRepository = new ExchangeRateRepository();
