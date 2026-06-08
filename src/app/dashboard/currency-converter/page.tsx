'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfileAction } from '@/controllers/profile.controller';
import { getLatestRatesAction } from '@/controllers/currency.controller';
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
} from '@/models/currency.model';
import {
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  Clock,
  Database,
  Globe,
  Info,
  DollarSign,
  Euro,
  Coins,
} from 'lucide-react';

// Details and aesthetics for supported currencies
const CURRENCY_INFO: Record<
  SupportedCurrency,
  { symbol: string; name: string; gradient: string; symbolChar: string }
> = {
  USD: { symbol: 'USD ($)', name: 'United States Dollar', gradient: 'from-emerald-500 to-teal-600', symbolChar: '$' },
  EUR: { symbol: 'EUR (€)', name: 'Euro', gradient: 'from-blue-600 to-indigo-700', symbolChar: '€' },
  GBP: { symbol: 'GBP (£)', name: 'British Pound Sterling', gradient: 'from-purple-600 to-pink-700', symbolChar: '£' },
  INR: { symbol: 'INR (₹)', name: 'Indian Rupee', gradient: 'from-amber-500 to-orange-600', symbolChar: '₹' },
  CAD: { symbol: 'CAD (C$)', name: 'Canadian Dollar', gradient: 'from-red-500 to-rose-600', symbolChar: '$' },
  AUD: { symbol: 'AUD (A$)', name: 'Australian Dollar', gradient: 'from-cyan-500 to-blue-600', symbolChar: '$' },
};

export default function CurrencyConverterPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [amount, setAmount] = useState<number>(100);
  const [amountInput, setAmountInput] = useState<string>('100');
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('USD');
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>('EUR');

  // API/Data states
  const [rates, setRates] = useState<Record<SupportedCurrency, number> | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);

  // Client validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch session user on mount to set preferred base currency
  useEffect(() => {
    const initUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const profileResult = await getProfileAction(user.id);
          if (profileResult.success && profileResult.data?.currency) {
            const prefCurrency = profileResult.data.currency as SupportedCurrency;
            if (SUPPORTED_CURRENCIES.includes(prefCurrency)) {
              setFromCurrency(prefCurrency);
              // Set toCurrency to something different than fromCurrency
              setToCurrency(prefCurrency === 'USD' ? 'EUR' : 'USD');
            }
          }
        }
      } catch (err) {
        console.error('Failed to resolve profile currency settings', err);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  // Fetch rates for base currency
  const fetchRates = useCallback(async (base: SupportedCurrency) => {
    setFetchingRates(true);
    setError(null);
    setWarning(null);

    const result = await getLatestRatesAction(base);
    setFetchingRates(false);

    if (result.success && result.data) {
      setRates(result.data.rates);
      setIsCached(result.data.isCached);
      setIsStale(!!result.data.isStale);
      setLastUpdated(result.data.lastUpdated);
      if (result.data.warning) {
        setWarning(result.data.warning);
      }
    } else {
      setError(result.error || 'Failed to fetch conversion rates.');
      setRates(null);
    }
  }, []);

  // Trigger rates fetch when fromCurrency changes
  useEffect(() => {
    fetchRates(fromCurrency);
  }, [fromCurrency, fetchRates]);

  // Handle amount validation & conversion
  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    if (!val || val.trim() === '') {
      setValidationError('Amount is required.');
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      setValidationError('Please enter a valid numeric value.');
      return;
    }

    if (num <= 0) {
      setValidationError('Amount must be greater than zero.');
      return;
    }

    if (num > 1000000000) {
      setValidationError('Amount is too large (maximum 1,000,000,000).');
      return;
    }

    setValidationError(null);
    setAmount(num);
  };

  // Swap currencies helper
  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Calculate conversions based on retrieved rates
  const currentRate = rates ? rates[toCurrency] : null;
  const convertedAmount = currentRate !== null && currentRate !== undefined ? amount * currentRate : null;

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Currency Converter</h2>
        <p className="text-sm text-muted-foreground">
          Convert funds between key student destinations and track real-time exchange rates.
        </p>
      </div>

      {/* Warnings or API errors */}
      {error && (
        <div className="p-4 rounded-xl border bg-destructive/10 border-destructive/20 text-destructive-foreground text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warning && (
        <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
          <Clock className="h-5 w-5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Grid: main tools + info & details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column (col-span-2): Main converter UI */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Glassmorphic 1-to-1 Converter Form */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Exchange Calculator</h3>
              </div>
              
              {/* Cache status badge */}
              {rates && lastUpdated && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full border border-border">
                  {isCached ? (
                    <>
                      <Database className="h-3 w-3 text-primary" />
                      <span>Cached</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 text-emerald-400" />
                      <span>Live Rate</span>
                    </>
                  )}
                  <span>•</span>
                  <span>
                    Refreshed: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3 items-end">
              {/* Amount input */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="convertAmount">
                  Amount to Convert
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-muted-foreground text-sm font-bold">
                    {CURRENCY_INFO[fromCurrency].symbolChar}
                  </span>
                  <input
                    id="convertAmount"
                    type="text"
                    value={amountInput}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 bg-secondary/30 border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary/50 transition-colors ${
                      validationError ? 'border-destructive' : 'border-border'
                    }`}
                    placeholder="100.00"
                  />
                </div>
              </div>

              {/* Currencies selects with Swap button */}
              <div className="grid grid-cols-7 gap-2 md:col-span-2 items-center">
                {/* From currency select */}
                <div className="col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="fromSelect">
                    From
                  </label>
                  <select
                    id="fromSelect"
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value as SupportedCurrency)}
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {CURRENCY_INFO[code].symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap button */}
                <div className="col-span-1 flex justify-center pt-5">
                  <button
                    onClick={handleSwap}
                    className="rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-primary hover:text-white p-2.5 transition-all duration-200 active:scale-95 group cursor-pointer"
                    title="Swap Currencies"
                  >
                    <ArrowLeftRight className="h-4.5 w-4.5 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* To currency select */}
                <div className="col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="toSelect">
                    To
                  </label>
                  <select
                    id="toSelect"
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value as SupportedCurrency)}
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {CURRENCY_INFO[code].symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Validation warning */}
            {validationError && (
              <p className="text-xs text-destructive-foreground/90 font-medium">{validationError}</p>
            )}

            {/* Conversion result visual zone */}
            <div className="rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-border/80 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[140px]">
              {fetchingRates ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground font-semibold">Updating rates...</span>
                </div>
              ) : convertedAmount !== null ? (
                <div className="space-y-1.5 z-10">
                  <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                    Converted Result
                  </p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{fromCurrency}</span>
                    <span className="text-lg font-bold text-muted-foreground">=</span>
                    <span className="text-3xl font-extrabold tracking-tight text-foreground">
                      {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{toCurrency}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span>Rate:</span>
                    <span className="text-foreground">1 {fromCurrency}</span>
                    <span>=</span>
                    <span className="text-foreground">
                      {currentRate?.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {toCurrency}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Select currencies to fetch details.</div>
              )}
            </div>
          </div>

          {/* Multi-Conversion Grid (Shows values for all other supported currencies) */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg">Multi-Currency Exchange rates</h3>
              <p className="text-xs text-muted-foreground">
                Simultaneous conversion of {amount.toLocaleString()} {fromCurrency} into all student destination currencies.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {SUPPORTED_CURRENCIES.map((code) => {
                const isBase = code === fromCurrency;
                const rateVal = rates ? rates[code] : null;
                const converted = rateVal !== null && rateVal !== undefined ? amount * rateVal : null;
                const info = CURRENCY_INFO[code];

                return (
                  <div
                    key={code}
                    className={`rounded-2xl border bg-card/25 p-4.5 space-y-3 relative overflow-hidden transition-all duration-300 group hover:shadow-lg hover:border-primary/20 ${
                      isBase ? 'border-primary/30 bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Circle glow */}
                    <div className="absolute -right-4 -bottom-4 h-12 w-12 rounded-full bg-primary/5 blur-lg group-hover:bg-primary/10 transition-all duration-300" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${info.gradient} text-white font-extrabold text-xs shadow-md`}
                        >
                          {info.symbolChar}
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight">{code}</p>
                          <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[110px]">
                            {info.name}
                          </p>
                        </div>
                      </div>
                      {isBase && (
                        <span className="text-[9px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          Base
                        </span>
                      )}
                    </div>

                    <div className="pt-2">
                      {fetchingRates ? (
                        <div className="h-6 w-16 bg-secondary/30 rounded animate-pulse" />
                      ) : converted !== null ? (
                        <p className="text-lg font-bold tracking-tight">
                          {converted.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">--</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Rate: {fetchingRates ? '...' : rateVal ? `1 ${fromCurrency} = ${rateVal.toFixed(4)} ${code}` : '--'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column (col-span-1): Quick Reference & Guide */}
        <div className="space-y-6">
          {/* Quick Conversion Card */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border pb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Conversions
            </h4>

            <div className="space-y-2.5">
              {[10, 50, 100, 250, 500, 1000].map((value) => {
                const valueConverted = currentRate ? value * currentRate : null;
                return (
                  <div
                    key={value}
                    className="flex justify-between items-center text-xs bg-secondary/20 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <span className="font-semibold text-muted-foreground">
                      {value.toLocaleString()} {fromCurrency}
                    </span>
                    <span className="font-bold text-foreground">
                      {fetchingRates ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : valueConverted !== null ? (
                        `${valueConverted.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ${toCurrency}`
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education / Info Tip Box */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4 text-xs">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border pb-2">
              <Info className="h-4 w-4 text-primary" />
              Student Exchange Tip
            </h4>
            
            <p className="text-muted-foreground leading-relaxed">
              University expenses depend heavily on daily rates. Using a local cache keeps conversion calculation instant while protecting API usage limits.
            </p>
            
            <div className="p-3.5 bg-secondary/15 rounded-xl border border-border space-y-2 leading-relaxed">
              <p className="font-semibold text-foreground">Caching Strategy:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Exchange rates are cached for 1 hour.</li>
                <li>Redundant fetch calls are blocked.</li>
                <li>Fallback serves last known rate if offline.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
