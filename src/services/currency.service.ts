import { exchangeRateRepository } from '@/repositories/exchange-rate.repository';
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
  ConvertCurrencyDTO
} from '@/models/currency.model';

export interface RatesResult {
  rates: Record<SupportedCurrency, number>;
  isCached: boolean;
  lastUpdated: string;
  isStale?: boolean;
  warning?: string;
}

export class CurrencyService {
  /**
   * Retrieves the latest exchange rates for a base currency,
   * checking the local database cache first and falling back to ExchangeRate API.
   */
  async getLatestRates(baseCurrency: SupportedCurrency): Promise<RatesResult> {
    // 1. Check database cache for each supported currency
    const cacheChecks = await Promise.all(
      SUPPORTED_CURRENCIES.map(async (target) => {
        if (target === baseCurrency) {
          return { target, rate: 1.0, isFresh: true, updatedAt: new Date().toISOString() };
        }
        try {
          const cached = await exchangeRateRepository.getRate(baseCurrency, target);
          if (!cached) return { target, rate: null, isFresh: false, updatedAt: null };

          // Rate is considered fresh if it is less than 1 hour old
          const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
          const isFresh = ageMs < 3600000; // 1 hour
          return { target, rate: cached.rate, isFresh, updatedAt: cached.updatedAt };
        } catch (err) {
          // Log and count as cache miss
          console.error(`Cache check failed for pair ${baseCurrency} -> ${target}`, err);
          return { target, rate: null, isFresh: false, updatedAt: null };
        }
      })
    );

    const allFresh = cacheChecks.every((check) => check.isFresh || check.target === baseCurrency);

    if (allFresh) {
      const rates = {} as Record<SupportedCurrency, number>;
      cacheChecks.forEach((check) => {
        rates[check.target] = check.rate!;
      });

      // Retrieve the oldest updated date among cached records to show correct last updated timestamp
      const oldestUpdate = cacheChecks
        .filter((c) => c.target !== baseCurrency && c.updatedAt)
        .reduce((min, cur) => {
          if (!min) return cur.updatedAt;
          return new Date(cur.updatedAt!) < new Date(min) ? cur.updatedAt : min;
        }, null as string | null);

      return {
        rates,
        isCached: true,
        lastUpdated: oldestUpdate || new Date().toISOString(),
      };
    }

    // 2. Fetch from external ExchangeRate API if cache is invalid or missing
    let responseData: any;
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      const url = apiKey
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
        : `https://open.er-api.com/v6/latest/${baseCurrency}`;

      const res = await fetch(url, {
        next: { revalidate: 3600 }, // Fetch cache option (Next.js)
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      responseData = await res.json();
      if (responseData.result !== 'success' || !responseData.rates) {
        throw new Error(responseData['error-type'] || 'Failed to fetch rates from provider');
      }
    } catch (error) {
      // API call failed. Fallback to stale database cache if we have any records
      const hasSomeCache = cacheChecks.some((check) => check.rate !== null && check.target !== baseCurrency);
      if (hasSomeCache) {
        const rates = {} as Record<SupportedCurrency, number>;
        cacheChecks.forEach((check) => {
          // If a rate is not in cache, fallback to 0 or 1 for baseCurrency
          rates[check.target] = check.rate !== null ? check.rate : (check.target === baseCurrency ? 1.0 : 0);
        });

        const latestUpdate = cacheChecks
          .filter((c) => c.updatedAt)
          .reduce((max, cur) => {
            if (!max) return cur.updatedAt;
            return new Date(cur.updatedAt!) > new Date(max) ? cur.updatedAt : max;
          }, null as string | null);

        return {
          rates,
          isCached: true,
          isStale: true,
          lastUpdated: latestUpdate || new Date().toISOString(),
          warning: 'Offline/API rate limit reached. Using cached exchange rates.',
        };
      }

      throw new Error(
        `Failed to fetch live exchange rates and no cached data is available: ${
          error instanceof Error ? error.message : 'Unknown network error'
        }`
      );
    }

    // 3. Upsert fetched rates into database and prepare response
    const rates = {} as Record<SupportedCurrency, number>;
    const savePromises = SUPPORTED_CURRENCIES.map(async (target) => {
      const rateVal = responseData.rates[target];
      if (rateVal === undefined) return;

      rates[target] = Number(rateVal);

      // No need to cache base-to-base conversion (always 1)
      if (target === baseCurrency) return;

      try {
        await exchangeRateRepository.upsert({
          fromCurrency: baseCurrency,
          toCurrency: target,
          rate: Number(rateVal),
        });
      } catch (err) {
        console.error(`Failed to cache rate for pair ${baseCurrency} -> ${target}`, err);
      }
    });

    await Promise.all(savePromises);

    return {
      rates,
      isCached: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Converts an amount from one currency to another using the cache-enabled rate service.
   */
  async convert(dto: ConvertCurrencyDTO) {
    const { amount, fromCurrency, toCurrency } = dto;
    const ratesResult = await this.getLatestRates(fromCurrency);
    const rate = ratesResult.rates[toCurrency];

    if (rate === undefined || rate === 0) {
      throw new Error(`Unable to determine conversion rate from ${fromCurrency} to ${toCurrency}`);
    }

    return {
      fromCurrency,
      toCurrency,
      amount,
      rate,
      convertedAmount: Number((amount * rate).toFixed(4)),
      lastUpdated: ratesResult.lastUpdated,
      isCached: ratesResult.isCached,
      isStale: ratesResult.isStale,
      warning: ratesResult.warning,
    };
  }
}

export const currencyService = new CurrencyService();
