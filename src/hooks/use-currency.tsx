'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfileAction } from '@/controllers/profile.controller';
import { formatCurrency } from '@/utils/currency';

interface CurrencyContextType {
  currencyCode: string;
  format: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPreferredCurrency = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const result = await getProfileAction(user.id);
        if (result.success && result.data?.currency) {
          setCurrencyCode(result.data.currency);
        }
      }
    } catch (error) {
      console.error('Failed to load preferred currency', error);
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

  const refreshCurrency = useCallback(async () => {
    setLoading(true);
    await fetchPreferredCurrency();
  }, [fetchPreferredCurrency]);

  return (
    <CurrencyContext.Provider value={{ currencyCode, format, refreshCurrency, loading }}>
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
