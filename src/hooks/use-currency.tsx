'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfileAction } from '@/controllers/profile.controller';
import { getLatestRatesAction } from '@/controllers/currency.controller';
import { formatCurrency } from '@/utils/currency';

interface CurrencyContextType {
  currencyCode: string; // Preferred Currency
  homeCurrencyCode: string | null;
  showHomeCurrency: boolean;
  exchangeRate: number | null;
  format: (amount: number) => string;
  formatHome: (amount: number) => string | null;
  refreshCurrency: () => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [homeCurrencyCode, setHomeCurrencyCode] = useState<string | null>(null);
  const [showHomeCurrency, setShowHomeCurrency] = useState<boolean>(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPreferredCurrency = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        const result = await getProfileAction(user.id);
        if (result.success && result.data) {
          const profile = result.data;
          const preferredCode = profile.currency || 'USD';
          setCurrencyCode(preferredCode);
          
          const homeCode = profile.homeCurrency?.code || null;
          setHomeCurrencyCode(homeCode);
          
          const showHome = profile.showHomeCurrency !== false;
          setShowHomeCurrency(showHome);

          // Retrieve exchange rate if home currency is different from preferred currency
          if (preferredCode && homeCode && preferredCode !== homeCode) {
            const ratesResult = await getLatestRatesAction(preferredCode as any);
            if (ratesResult.success && ratesResult.data?.rates) {
              const rate = (ratesResult.data.rates as Record<string, number>)[homeCode];
              setExchangeRate(rate || null);
            } else {
              setExchangeRate(null);
            }
          } else {
            setExchangeRate(1.0);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load preferred currency and exchange rates', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferredCurrency();
  }, [fetchPreferredCurrency]);

  const format = useCallback(
    (amount: number) => {
      return formatCurrency(amount, currencyCode);
    },
    [currencyCode]
  );

  const formatHome = useCallback(
    (amount: number) => {
      if (
        !showHomeCurrency || 
        !homeCurrencyCode || 
        currencyCode === homeCurrencyCode || 
        exchangeRate === null || 
        isNaN(exchangeRate)
      ) {
        return null;
      }
      const converted = amount * exchangeRate;
      return `≈ ${formatCurrency(converted, homeCurrencyCode)}`;
    },
    [showHomeCurrency, homeCurrencyCode, currencyCode, exchangeRate]
  );

  const refreshCurrency = useCallback(async () => {
    setLoading(true);
    await fetchPreferredCurrency();
  }, [fetchPreferredCurrency]);

  return (
    <CurrencyContext.Provider 
      value={{ 
        currencyCode, 
        homeCurrencyCode,
        showHomeCurrency,
        exchangeRate,
        format, 
        formatHome,
        refreshCurrency, 
        loading 
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
