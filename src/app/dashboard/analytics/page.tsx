'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PiggyBank,
  Loader2,
  AlertCircle,
  Search,
  MapPin,
  Home,
  Utensils,
  Car,
  Zap,
  Globe,
  HeartPulse,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { getAnalyticsSummaryAction } from '@/controllers/analytics.controller';
import { getLatestRatesAction } from '@/controllers/currency.controller';
import {
  searchLocationsAction,
  getLocationCostDetailsAction,
  getUniqueCountriesAction,
  getCitiesByCountryAction,
} from '@/controllers/cost-of-living.controller';
import { AnalyticsSummary } from '@/services/analytics.service';
import { CostOfLivingDetails, CostBreakdown } from '@/services/cost-of-living.service';
import { CostOfLiving } from '@/models/cost-of-living.model';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useCurrency } from '@/hooks/use-currency';
import { formatCurrency } from '@/utils/currency';
import { useChartFilter, TimeRange } from '@/hooks/use-chart-filter';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';

// Custom colors for charts
const COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#6b7280'];

export default function AnalyticsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'col'>('reports');

  // Chart aggregation loading states
  const [spendingTrendLoading, setSpendingTrendLoading] = useState(false);
  const [savingsTrendLoading, setSavingsTrendLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [budgetUsageLoading, setBudgetUsageLoading] = useState(false);

  // Sync state
  const [syncCharts, setSyncCharts] = useState(true);

  // Individual chart filters
  const [globalFilter, setGlobalFilter, isGlobalInit] = useChartFilter('analytics-global', 'month');
  const [spendingFilter, setSpendingFilter, isSpendingInit] = useChartFilter('analytics-spending', 'month');
  const [savingsFilter, setSavingsFilter, isSavingsInit] = useChartFilter('analytics-savings', 'month');
  const [categoriesFilter, setCategoriesFilter, isCategoriesInit] = useChartFilter('analytics-categories', 'month');
  const [budgetFilter, setBudgetFilter, isBudgetInit] = useChartFilter('analytics-budget', 'month');

  // Individual chart datasets
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);

  // Reports data
  const [reportsData, setReportsData] = useState<AnalyticsSummary | null>(null);
  const [reportsError, setReportsError] = useState('');

  // Cost of Living search data
  const [colSearchQuery, setColSearchQuery] = useState('');
  const [colSuggestions, setColSuggestions] = useState<CostOfLiving[]>([]);
  const [colDetails, setColDetails] = useState<CostOfLivingDetails | null>(null);
  const [colLoading, setColLoading] = useState(false);
  const [colError, setColError] = useState('');

  // Country and City Selection
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [cities, setCities] = useState<CostOfLiving[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Compare mode state: up to 3 slots
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareSlots, setCompareSlots] = useState<{ country: string; city: string; details: CostOfLivingDetails | null }[]>([
    { country: '', city: '', details: null },
    { country: '', city: '', details: null },
    { country: '', city: '', details: null }
  ]);
  const [compareCitiesList, setCompareCitiesList] = useState<CostOfLiving[][]>([[], [], []]);

  const { format, currencyCode } = useCurrency();
  const [usdRates, setUsdRates] = useState<Record<string, number>>({
    USD: 1.0, EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.51, INR: 83.50
  });

  const getCountryCurrency = (country: string): string => {
    const c = country.toLowerCase();
    if (c.includes('india')) return 'INR';
    if (c.includes('united kingdom') || c.includes('uk')) return 'GBP';
    if (c.includes('canada')) return 'CAD';
    if (c.includes('australia')) return 'AUD';
    if (c.includes('germany') || c.includes('france') || c.includes('italy') || c.includes('spain') || c.includes('netherlands') || c.includes('ireland') || c.includes('belgium') || c.includes('austria') || c.includes('portugal') || c.includes('greece') || c.includes('finland')) return 'EUR';
    return 'USD';
  };

  const formatColAmount = (usdValue: number, country: string) => {
    const countryCurrency = getCountryCurrency(country);
    const rateCountry = usdRates[countryCurrency] || 1.0;
    const ratePreferred = usdRates[currencyCode] || 1.0;

    const valCountry = usdValue * rateCountry;
    const valPreferred = usdValue * ratePreferred;

    if (countryCurrency === currencyCode) {
      return format(valPreferred);
    }

    return `${formatCurrency(valCountry, countryCurrency)} (${format(valPreferred)})`;
  };

  // Fetch session user on mount
  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch live exchange rates for USD on tab switch
  useEffect(() => {
    if (activeTab === 'col') {
      const fetchUsdRates = async () => {
        const result = await getLatestRatesAction('USD');
        if (result.success && result.data?.rates) {
          setUsdRates(result.data.rates);
        }
      };
      fetchUsdRates();
    }
  }, [activeTab]);

  // Granular chart aggregators
  const fetchSpendingTrend = useCallback(async (range: 'day' | 'week' | 'month') => {
    if (!userId) return;
    setSpendingTrendLoading(true);
    const result = await getAnalyticsSummaryAction(userId, range);
    if (result.success && result.data) {
      // Map aggregated expense trend
      const trend = result.data.savingsTrend || [];
      const mapped = trend.map((point: any) => ({
        month: point.month,
        amount: point.expenses,
      }));
      setSpendingData(mapped);
    }
    setSpendingTrendLoading(false);
  }, [userId]);

  const fetchSavingsTrend = useCallback(async (range: 'day' | 'week' | 'month') => {
    if (!userId) return;
    setSavingsTrendLoading(true);
    const result = await getAnalyticsSummaryAction(userId, range);
    if (result.success && result.data) {
      setSavingsData(result.data.savingsTrend || []);
    }
    setSavingsTrendLoading(false);
  }, [userId]);

  const fetchCategories = useCallback(async (range: 'day' | 'week' | 'month') => {
    if (!userId) return;
    setCategoriesLoading(true);
    const result = await getAnalyticsSummaryAction(userId, range);
    if (result.success && result.data) {
      setCategoriesData(result.data.categoryDistribution || []);
    }
    setCategoriesLoading(false);
  }, [userId]);

  const fetchBudgetUsage = useCallback(async (range: 'day' | 'week' | 'month') => {
    if (!userId) return;
    setBudgetUsageLoading(true);
    const result = await getAnalyticsSummaryAction(userId, range);
    if (result.success && result.data) {
      setBudgetData(result.data.budgetUsageTrend || []);
    }
    setBudgetUsageLoading(false);
  }, [userId]);

  // Fetch KPI/Card overview summaries
  const fetchOverviewCards = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setReportsError('');
    // Always query monthly for standard overall KPI values
    const result = await getAnalyticsSummaryAction(userId, 'month');
    if (result.success && result.data) {
      setReportsData(result.data);
    } else {
      setReportsError(result.error || 'Failed to retrieve analytics overview details.');
    }
    setLoading(false);
  }, [userId]);

  // Trigger synchronization effects
  useEffect(() => {
    if (userId) {
      fetchOverviewCards();
    }
  }, [userId, fetchOverviewCards]);

  useEffect(() => {
    if (!userId) return;
    const activeSpendingFilter = syncCharts ? globalFilter : spendingFilter;
    if (isGlobalInit && isSpendingInit) {
      fetchSpendingTrend(activeSpendingFilter);
    }
  }, [userId, globalFilter, spendingFilter, syncCharts, isGlobalInit, isSpendingInit, fetchSpendingTrend]);

  useEffect(() => {
    if (!userId) return;
    const activeSavingsFilter = syncCharts ? globalFilter : savingsFilter;
    if (isGlobalInit && isSavingsInit) {
      fetchSavingsTrend(activeSavingsFilter);
    }
  }, [userId, globalFilter, savingsFilter, syncCharts, isGlobalInit, isSavingsInit, fetchSavingsTrend]);

  useEffect(() => {
    if (!userId) return;
    const activeCategoriesFilter = syncCharts ? globalFilter : categoriesFilter;
    if (isGlobalInit && isCategoriesInit) {
      fetchCategories(activeCategoriesFilter);
    }
  }, [userId, globalFilter, categoriesFilter, syncCharts, isGlobalInit, isCategoriesInit, fetchCategories]);

  useEffect(() => {
    if (!userId) return;
    const activeBudgetFilter = syncCharts ? globalFilter : budgetFilter;
    if (isGlobalInit && isBudgetInit) {
      fetchBudgetUsage(activeBudgetFilter);
    }
  }, [userId, globalFilter, budgetFilter, syncCharts, isGlobalInit, isBudgetInit, fetchBudgetUsage]);


  // Fetch unique countries on tab switch
  useEffect(() => {
    if (activeTab === 'col' && countries.length === 0) {
      const loadCountries = async () => {
        const result = await getUniqueCountriesAction();
        if (result.success && result.data) {
          setCountries(result.data);
        }
      };
      loadCountries();
    }
  }, [activeTab, countries.length]);

  // Fetch cities when selected country changes
  useEffect(() => {
    if (selectedCountry) {
      const loadCities = async () => {
        const result = await getCitiesByCountryAction(selectedCountry);
        if (result.success && result.data) {
          setCities(result.data);
          setSelectedCity('');
          setColDetails(null);
        }
      };
      loadCities();
    } else {
      setCities([]);
      setSelectedCity('');
      setColDetails(null);
    }
  }, [selectedCountry]);

  // Handle single city selection details
  const handleCitySelect = async (cityName: string) => {
    setSelectedCity(cityName);
    if (!cityName) {
      setColDetails(null);
      return;
    }
    setColLoading(true);
    setColError('');
    const result = await getLocationCostDetailsAction(cityName, selectedCountry);
    if (result.success && result.data) {
      setColDetails(result.data);
    } else {
      setColError(result.error || 'Failed to retrieve cost of living details.');
    }
    setColLoading(false);
  };

  // Compare mode slots change handlers
  const handleCompareCountryChange = async (index: number, country: string) => {
    const updatedSlots = [...compareSlots];
    updatedSlots[index] = { country, city: '', details: null };
    setCompareSlots(updatedSlots);

    if (country) {
      const result = await getCitiesByCountryAction(country);
      if (result.success && result.data) {
        setCompareCitiesList(prev => {
          const updated = [...prev];
          updated[index] = result.data || [];
          return updated;
        });
      }
    } else {
      setCompareCitiesList(prev => {
        const updated = [...prev];
        updated[index] = [];
        return updated;
      });
    }
  };

  const handleCompareCityChange = async (index: number, city: string) => {
    const country = compareSlots[index].country;
    const updatedSlots = [...compareSlots];
    updatedSlots[index] = { ...updatedSlots[index], city, details: null };
    setCompareSlots(updatedSlots);

    if (city && country) {
      setColLoading(true);
      const result = await getLocationCostDetailsAction(city, country);
      if (result.success && result.data) {
        setCompareSlots(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], details: result.data };
          return updated;
        });
      }
      setColLoading(false);
    }
  };

  const toggleCompareMode = () => {
    const nextMode = !compareMode;
    setCompareMode(nextMode);

    if (nextMode) {
      // Prep slot 1 with current selected
      setCompareSlots([
        { country: selectedCountry, city: selectedCity, details: colDetails },
        { country: '', city: '', details: null },
        { country: '', city: '', details: null }
      ]);
      if (selectedCountry) {
        getCitiesByCountryAction(selectedCountry).then(result => {
          if (result.success && result.data) {
            setCompareCitiesList(prev => {
              const updated = [...prev];
              updated[0] = result.data || [];
              return updated;
            });
          }
        });
      }
    }
  };

  // Loading state
  if (loading && !userId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">Please sign in to view your financial analytics.</p>
      </div>
    );
  }

  const cards = reportsData?.cards || {
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    remainingBudget: 0,
  };

  // Cost of living chart data mapping
  const colChartData = colDetails
    ? [
      { name: 'Rent', value: Number((colDetails.breakdown.rent * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Food', value: Number((colDetails.breakdown.food * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Transport', value: Number((colDetails.breakdown.transport * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Utilities', value: Number((colDetails.breakdown.utilities * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Internet', value: Number((colDetails.breakdown.internet * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Healthcare', value: Number((colDetails.breakdown.healthcare * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
      { name: 'Entertainment', value: Number((colDetails.breakdown.entertainment * (usdRates[currencyCode] || 1.0)).toFixed(2)) },
    ]
    : [];

  // Compare chart data mapping
  const colCompareChartData = (() => {
    const categories = ['Rent', 'Food', 'Transport', 'Utilities', 'Internet', 'Healthcare', 'Entertainment'];
    return categories.map(cat => {
      const row: any = { name: cat };
      compareSlots.forEach((slot) => {
        if (slot.details) {
          const key = `${slot.details.location.city}, ${slot.details.location.country}`;
          const prop = cat.toLowerCase() as keyof CostBreakdown;
          const usdVal = slot.details.breakdown[prop] || 0;
          row[key] = Number((usdVal * (usdRates[currencyCode] || 1.0)).toFixed(2));
        }
      });
      return row;
    });
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Financial Insights</h2>
          <p className="text-sm text-muted-foreground">
            Explore detailed analytics or plan ahead with the international Cost of Living search tool.
          </p>
        </div>

        {/* Tab Toggle buttons */}
        <div className="inline-flex rounded-xl bg-secondary/20 p-1 border border-border">
          <button
            onClick={() => setActiveTab('reports')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'reports'
              ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Financial Reports
          </button>
          <button
            onClick={() => setActiveTab('col')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${activeTab === 'col'
              ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Cost of Living
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <>
          {reportsError && (
            <div className="p-4 rounded-xl border bg-destructive/10 border-destructive/20 text-destructive-foreground text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {reportsError}
            </div>
          )}

          {/* Sync All Charts Selector Panel */}
          <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <input
                id="sync-charts-checkbox"
                type="checkbox"
                checked={syncCharts}
                onChange={(e) => setSyncCharts(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/45 bg-[#0b0c10]"
              />
              <label htmlFor="sync-charts-checkbox" className="text-xs font-bold text-slate-300 cursor-pointer selection:bg-transparent">
                Sync all charts to same view
              </label>
            </div>
            {syncCharts && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Select View:</span>
                <TimeRangeSelector value={globalFilter} onChange={setGlobalFilter} />
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Income"
              value={format(cards.totalIncome)}
              icon={ArrowUpRight}
              trend={{ value: 0, isPositive: true }}
              gradient="from-purple-950/20 to-card/50"
            />
            <StatsCard
              title="Total Expenses"
              value={format(cards.totalExpenses)}
              icon={ArrowDownRight}
              trend={{ value: 0, isPositive: false }}
              gradient="from-emerald-950/10 to-card/50"
            />
            <StatsCard
              title="Total Savings"
              value={format(cards.totalSavings)}
              icon={DollarSign}
              description="Net saved surplus"
              gradient="from-card to-card/50"
            />
            <StatsCard
              title="Remaining Budget"
              value={format(cards.remainingBudget)}
              icon={PiggyBank}
              description="Active budget buffer"
              gradient="from-card to-card/50"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 1. Monthly Spending Trend */}
            <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Spending Trend</h3>
                  <p className="text-xs text-muted-foreground">Aggregate expenses across selected time range</p>
                </div>
                {!syncCharts && (
                  <TimeRangeSelector value={spendingFilter} onChange={setSpendingFilter} />
                )}
              </div>

              <div className="flex-1 w-full min-h-[220px] relative">
                {spendingTrendLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-xl">
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Aggregating spending...
                    </span>
                  </div>
                )}
                {mounted && spendingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spendingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMonthlyExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                      <XAxis dataKey="month" stroke="#8b8b9a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#8b8b9a" fontSize={11} tickLine={false} tickFormatter={(value) => format(value)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181824',
                          borderColor: '#2f2f3f',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any) => [format(Number(value)), name]}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#ec4899" fillOpacity={1} fill="url(#colorMonthlyExpense)" strokeWidth={2} name="Expenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : !spendingTrendLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl p-4">
                    <p className="font-semibold text-slate-400">No records found</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">No expense data matches the selected view.</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 2. Savings Trend */}
            <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Savings Trend</h3>
                  <p className="text-xs text-muted-foreground">Income, expenses, and savings compared</p>
                </div>
                {!syncCharts && (
                  <TimeRangeSelector value={savingsFilter} onChange={setSavingsFilter} />
                )}
              </div>

              <div className="flex-1 w-full min-h-[220px] relative">
                {savingsTrendLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-xl">
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Comparing cash flows...
                    </span>
                  </div>
                )}
                {mounted && savingsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={savingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                      <XAxis dataKey="month" stroke="#8b8b9a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#8b8b9a" fontSize={11} tickLine={false} tickFormatter={(value) => format(value)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181824',
                          borderColor: '#2f2f3f',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any) => [format(Number(value)), name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="income" fill="#10b981" name="Income" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" fill="#a855f7" name="Expenses" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="savings" fill="#3b82f6" name="Savings" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : !savingsTrendLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl p-4">
                    <p className="font-semibold text-slate-400">No records found</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">No matching transactions in this range.</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 3. Top Spending Categories */}
            <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Top Spending Categories</h3>
                  <p className="text-xs text-muted-foreground">Breakdown of expenses by category</p>
                </div>
                {!syncCharts && (
                  <TimeRangeSelector value={categoriesFilter} onChange={setCategoriesFilter} />
                )}
              </div>

              <div className="flex-1 grid gap-4 md:grid-cols-5 items-center relative">
                {categoriesLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-xl">
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Grouping categories...
                    </span>
                  </div>
                )}
                <div className="h-[220px] md:col-span-3">
                  {mounted && categoriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#181824',
                            borderColor: '#2f2f3f',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                          formatter={(value: any, name: any) => [format(Number(value)), name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : !categoriesLoading ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl p-4">
                      No categories.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 md:col-span-2">
                  {categoriesData.length > 0 ? (
                    categoriesData.map((entry, index) => {
                      const totalExpenseAmount = categoriesData.reduce((acc, curr) => acc + curr.value, 0);
                      const percentage = totalExpenseAmount > 0 ? Math.round((entry.value / totalExpenseAmount) * 100) : 0;
                      return (
                        <div key={entry.name} className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2 text-muted-foreground truncate max-w-[120px]">
                            <span
                              className="h-3 w-3 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="truncate">{entry.name}</span>
                          </div>
                          <div className="text-foreground text-[11px]">
                            {format(entry.value)} ({percentage}%)
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground text-center">
                      No expenses.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Budget Usage Trend */}
            <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Budget Usage Trend</h3>
                  <p className="text-xs text-muted-foreground">Compare actual expenses against active budget limits</p>
                </div>
                {!syncCharts && (
                  <TimeRangeSelector value={budgetFilter} onChange={setBudgetFilter} />
                )}
              </div>

              <div className="flex-1 w-full min-h-[220px] max-h-[240px] overflow-y-auto space-y-4 pr-1 relative">
                {budgetUsageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-xl">
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Evaluating budgets...
                    </span>
                  </div>
                )}
                {mounted && budgetData.length > 0 ? (
                  budgetData.map((b) => (
                    <div key={b.category} className="space-y-1.5 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-foreground">{b.category}</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{format(b.spent)}</strong> / {format(b.budget)}
                        </span>
                      </div>

                      {/* Custom progress bar */}
                      <div className="h-2.5 w-full rounded-full bg-secondary/40 overflow-hidden relative border border-border/20">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${b.usagePercent >= 100
                            ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                            : b.usagePercent >= 80
                              ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                              : 'bg-primary'
                            }`}
                          style={{ width: `${Math.min(100, b.usagePercent)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                        <span>Usage: {b.usagePercent}%</span>
                        {b.usagePercent >= 100 ? (
                          <span className="text-rose-400 font-extrabold uppercase">Over budget</span>
                        ) : b.usagePercent >= 80 ? (
                          <span className="text-amber-400 font-extrabold uppercase">Warning threshold</span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold uppercase">Safe</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : !budgetUsageLoading ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl p-4">
                    No active budgets. Set limits on Budgets page.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Cost of Living calculator layout */
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">Destination Cost Planner</h3>
                <p className="text-xs text-muted-foreground">Select a country and city to plan your student budget, or compare up to three locations side-by-side.</p>
              </div>

              {/* Compare Mode Toggle Button */}
              {selectedCountry && (
                <button
                  onClick={toggleCompareMode}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${compareMode
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'bg-secondary/20 border-border text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Globe className="h-4 w-4" />
                  {compareMode ? 'Switch to Single Search' : 'Compare Cities'}
                </button>
              )}
            </div>

            {/* Inputs Section */}
            {!compareMode ? (
              /* Single Location Mode selectors */
              <div className="flex flex-col md:flex-row gap-4 items-center max-w-2xl">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">1. Select Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors text-foreground font-semibold"
                  >
                    <option value="" className="bg-card">Choose Country...</option>
                    {countries.map((c) => (
                      <option key={c} value={c} className="bg-card">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">2. Select City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCitySelect(e.target.value)}
                    disabled={!selectedCountry}
                    className="w-full px-4 py-3 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-card">Choose City...</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.city} className="bg-card">{city.city}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Compare Mode - Up to 3 Slots selectors */
              <div className="grid gap-4 md:grid-cols-3">
                {compareSlots.map((slot, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-secondary/5 p-4 space-y-3">
                    <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider">Location Slot {index + 1}</h4>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Country</label>
                      <select
                        value={slot.country}
                        onChange={(e) => handleCompareCountryChange(index, e.target.value)}
                        className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 transition-colors text-foreground font-semibold"
                      >
                        <option value="" className="bg-card">Choose Country...</option>
                        {countries.map((c) => (
                          <option key={c} value={c} className="bg-card">{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">City</label>
                      <select
                        value={slot.city}
                        onChange={(e) => handleCompareCityChange(index, e.target.value)}
                        disabled={!slot.country}
                        className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 transition-colors text-foreground font-semibold disabled:opacity-50"
                      >
                        <option value="" className="bg-card">Choose City...</option>
                        {(compareCitiesList[index] || []).map((city) => (
                          <option key={city.id} value={city.city} className="bg-card">{city.city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {colLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Retrieving cost calculations...</p>
            </div>
          ) : colError ? (
            <div className="p-4 rounded-xl border bg-destructive/10 border-destructive/20 text-destructive-foreground text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {colError}
            </div>
          ) : compareMode ? (
            /* Compare Mode Results View */
            <div className="space-y-6">
              {/* Cards Grid */}
              <div className="grid gap-6 md:grid-cols-3">
                {compareSlots.map((slot, index) => {
                  if (!slot.details) {
                    return (
                      <div key={index} className="rounded-2xl border border-dashed border-border bg-card/10 p-6 flex flex-col items-center justify-center min-h-[140px] text-center text-xs text-muted-foreground">
                        <MapPin className="h-6 w-6 mb-2 opacity-40" />
                        Select a country and city to fill Slot {index + 1}
                      </div>
                    );
                  }
                  return (
                    <div key={index} className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider">Slot {index + 1} Details</h4>
                          <h3 className="text-lg font-black text-foreground mt-1 truncate">{slot.details.location.city}</h3>
                          <p className="text-xs text-primary font-bold">{slot.details.location.country}</p>
                        </div>
                        <span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary uppercase tracking-wider">
                          Index: {slot.details.location.indexScore}
                        </span>
                      </div>
                      <div className="border-t border-border/50 pt-3 flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground font-semibold">Est. Monthly Cost:</span>
                        <span className="text-sm font-black text-foreground">{formatColAmount(slot.details.estimatedMonthlyCost, slot.details.location.country)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Graphical Comparison Grid */}
              {compareSlots.some(s => s.details) ? (
                <div className="grid gap-6 lg:grid-cols-5">
                  {/* side-by-side Bar Chart (3 cols) */}
                  <div className="lg:col-span-3 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg">Category Cost Comparison</h3>
                      <p className="text-xs text-muted-foreground">Proportionate category breakdown comparison between selected locations</p>
                    </div>

                    <div className="flex-1 w-full min-h-[350px] my-4">
                      {mounted && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={colCompareChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" horizontal={false} />
                            <XAxis type="number" stroke="#8b8b9a" fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#8b8b9a" fontSize={11} tickLine={false} width={80} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#181824',
                                borderColor: '#2f2f3f',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontSize: '12px',
                              }}
                              formatter={(value: any, name: any) => [format(Number(value)), name]}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                            {compareSlots.filter(s => s.details).map((slot, idx) => {
                              const keyName = `${slot.details!.location.city}, ${slot.details!.location.country}`;
                              return (
                                <Bar
                                  key={idx}
                                  dataKey={keyName}
                                  fill={COLORS[idx % COLORS.length]}
                                  radius={[0, 4, 4, 0]}
                                  name={slot.details!.location.city}
                                />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Detailed Table (2 cols) */}
                  <div className="lg:col-span-2 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md space-y-4">
                    <h3 className="font-bold text-lg">Comparison Table</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/80 text-[10px] uppercase text-muted-foreground font-black">
                            <th className="py-2">Category</th>
                            {compareSlots.map((slot, idx) => (
                              <th key={idx} className="py-2 text-right">
                                {slot.details ? slot.details.location.city : `Slot ${idx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-semibold">
                          {['Rent', 'Food', 'Transport', 'Utilities', 'Internet', 'Healthcare', 'Entertainment'].map((cat) => {
                            const prop = cat.toLowerCase() as keyof CostBreakdown;
                            return (
                              <tr key={cat}>
                                <td className="py-2.5 text-muted-foreground">{cat}</td>
                                {compareSlots.map((slot, idx) => (
                                  <td key={idx} className="py-2.5 text-right text-foreground">
                                    {slot.details ? formatColAmount(slot.details.breakdown[prop], slot.details.location.country) : '-'}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card/30 p-12 text-center backdrop-blur-md space-y-3">
                  <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h4 className="font-bold text-base">Select locations to compare</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Select a country and city for multiple slots above to display comparison breakdown charts and tables.
                  </p>
                </div>
              )}
            </div>
          ) : colDetails ? (
            /* Results Breakdown Display */
            <div className="grid gap-6 md:grid-cols-5">
              {/* Stat Cards (2 cols) */}
              <div className="md:col-span-2 space-y-6">
                {/* Total Cost */}
                <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider">Est. Monthly Cost</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Estimated total student support cost</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black mt-4">{formatColAmount(colDetails.estimatedMonthlyCost, colDetails.location.country)}</h3>
                </div>

                {/* Index Score */}
                <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider">Index Score</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Comparative score relative to NYC (100)</p>
                    </div>
                    <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black mt-4">{colDetails.location.indexScore}</h3>
                </div>

                {/* Location metadata card */}
                <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-3">
                    <MapPin className="h-4.5 w-4.5 text-primary" />
                    Destination Details
                  </h4>
                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City:</span>
                      <span>{colDetails.location.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country:</span>
                      <span>{colDetails.location.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference base:</span>
                      <span className="text-muted-foreground">Student Ratio Formula</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Breakdown (3 cols) */}
              <div className="md:col-span-3 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg">Category Distribution Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Proportionate breakdown of the total monthly estimated budget</p>
                </div>

                <div className="flex-1 w-full min-h-[260px] my-4">
                  {mounted && colChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={colChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" horizontal={false} />
                        <XAxis type="number" stroke="#8b8b9a" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#8b8b9a" fontSize={11} tickLine={false} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#181824',
                            borderColor: '#2f2f3f',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                          formatter={(value: any, name: any) => [format(Number(value)), name]}
                        />
                        <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} name={`Estimated Cost (${currencyCode})`} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Categorical break list */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-border pt-4">
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <Home className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Rent (40%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.rent, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <Utensils className="h-5 w-5 text-pink-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Food (20%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.food, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <Car className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Transport (10%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.transport, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Utilities (8%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.utilities, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <Globe className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Internet (4%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.internet, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40">
                    <HeartPulse className="h-5 w-5 text-indigo-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Healthcare (8%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.healthcare, colDetails.location.country)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/15 rounded-xl p-3.5 border border-border/40 sm:col-span-2">
                    <Sparkles className="h-5 w-5 text-teal-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Entertainment (10%)</p>
                      <p className="font-bold text-sm text-foreground">{formatColAmount(colDetails.breakdown.entertainment, colDetails.location.country)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/30 p-12 text-center backdrop-blur-md space-y-3">
              <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-base">Select a location</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Select a Country and City from the selectors above to plan and view detailed student budget indicators.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
