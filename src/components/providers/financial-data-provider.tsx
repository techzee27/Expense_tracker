'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, RefreshCw, LogOut, Home } from 'lucide-react';
import { getProfileAction } from '@/controllers/profile.controller';
import { getIncomesAction, getSchedulesAction, getExpectedMonthlyIncomeAction } from '@/controllers/income.controller';
import { getExpensesAction } from '@/controllers/expense.controller';
import { getBudgetsWithUsageAction } from '@/controllers/budget.controller';
import { getSavingsGoalsAction } from '@/controllers/savings-goal.controller';
import { getGoalAllocationsAction } from '@/controllers/goal-allocation.controller';
import { getAnalyticsSummaryAction } from '@/controllers/analytics.controller';
import { useCurrency } from '@/hooks/use-currency';

interface FinancialDataContextType {
  isAppFinancialDataReady: boolean;
  userId: string | null;
  profile: any;
  incomes: any[];
  schedules: any[];
  expenses: any[];
  budgets: any[];
  savingsGoals: any[];
  allocations: any[];
  expectedIncomeData: any;
  analyticsSummary: any;
  refreshData: () => Promise<void>;
  loading: boolean;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isAppFinancialDataReady, setIsAppFinancialDataReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Loaded Data
  const [profile, setProfile] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [expectedIncomeData, setExpectedIncomeData] = useState<any>({
    expectedIncome: null,
    receivedIncome: null,
    remainingExpected: null,
  });
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);

  // Fade out state for loader
  const [showLoaderUI, setShowLoaderUI] = useState(true);
  const [fadeLoader, setFadeLoader] = useState(false);

  // Fetch session user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setSessionLoading(false);
    };
    fetchUser();
  }, []);

  const loadAllFinancialData = useCallback(async (isInitial: boolean) => {
    if (!userId) return;

    if (isInitial) {
      setLoading(true);
      setShowLoaderUI(true);
      setFadeLoader(false);
      setIsAppFinancialDataReady(false);
    }
    setError(null);

    try {
      // Step 1: User Profile
      setLoadingStep('Synchronizing User Profile');
      setLoadingProgress(10);
      const profileResult = await getProfileAction(userId);
      if (!profileResult.success) throw new Error(profileResult.error || 'Failed to load user profile');
      setProfile(profileResult.data);

      // Step 2: Income records & recurring income
      setLoadingStep('Synchronizing Income Records');
      setLoadingProgress(30);
      const [incomeResult, schedulesResult, expectedIncomeResult] = await Promise.all([
        getIncomesAction(userId, { limit: 1000 }),
        getSchedulesAction(userId),
        getExpectedMonthlyIncomeAction(userId)
      ]);
      if (!incomeResult.success) throw new Error(incomeResult.error || 'Failed to load income records');
      if (!schedulesResult.success) throw new Error(schedulesResult.error || 'Failed to load recurring schedules');
      if (!expectedIncomeResult.success) throw new Error(expectedIncomeResult.error || 'Failed to load expected monthly income');
      setIncomes(incomeResult.data?.incomes || []);
      setSchedules((schedulesResult.data as any[]) || []);
      setExpectedIncomeData(expectedIncomeResult.data || { expectedIncome: null, receivedIncome: null, remainingExpected: null });

      // Step 3: Expense records
      setLoadingStep('Synchronizing Expense Records');
      setLoadingProgress(50);
      const expenseResult = await getExpensesAction(userId, { limit: 1000 });
      if (!expenseResult.success) throw new Error(expenseResult.error || 'Failed to load expense records');
      setExpenses(expenseResult.data?.expenses || []);

      // Step 4: Budget records & usage
      setLoadingStep('Synchronizing Budgets');
      setLoadingProgress(70);
      const budgetResult = await getBudgetsWithUsageAction(userId);
      if (!budgetResult.success) throw new Error(budgetResult.error || 'Failed to load budget records');
      setBudgets(budgetResult.data || []);

      // Step 5: Savings Goals & Allocations
      setLoadingStep('Synchronizing Savings & Goals');
      setLoadingProgress(85);
      const [savingsResult, allocationsResult] = await Promise.all([
        getSavingsGoalsAction(userId),
        getGoalAllocationsAction(userId)
      ]);
      if (!savingsResult.success) throw new Error(savingsResult.error || 'Failed to load savings goals');
      if (!allocationsResult.success) throw new Error(allocationsResult.error || 'Failed to load goal allocations');
      setSavingsGoals((savingsResult.data as any[]) || []);
      setAllocations((allocationsResult.data as any[]) || []);

      // Step 6: Dashboard analytics summary
      setLoadingStep('Preparing Dashboard Aggregations');
      setLoadingProgress(95);
      const analyticsResult = await getAnalyticsSummaryAction(userId);
      if (!analyticsResult.success) throw new Error(analyticsResult.error || 'Failed to load analytics summary');
      setAnalyticsSummary(analyticsResult.data || null);

      setLoadingProgress(100);
      setLoadingStep('Data Ready');
      setIsAppFinancialDataReady(true);

      // Trigger fade transition
      if (isInitial) {
        setFadeLoader(true);
        setTimeout(() => {
          setShowLoaderUI(false);
        }, 500); // 500ms fade transition
      }
    } catch (err: any) {
      console.error('Global financial data load error:', err);
      setError(err.message || 'An unexpected error occurred while fetching your financial data.');
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Load data when user becomes available
  useEffect(() => {
    if (userId) {
      loadAllFinancialData(true);
    } else if (!sessionLoading) {
      setIsAppFinancialDataReady(true);
      setShowLoaderUI(false);
    }
  }, [userId, sessionLoading, loadAllFinancialData]);

  const refreshData = async () => {
    await loadAllFinancialData(false);
  };

  const handleRetry = () => {
    loadAllFinancialData(true);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // If session is loading, show blank or simple spinner
  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Handle Loading & Transition View
  return (
    <FinancialDataContext.Provider
      value={{
        isAppFinancialDataReady,
        userId,
        profile,
        incomes,
        schedules,
        expenses,
        budgets,
        savingsGoals,
        allocations,
        expectedIncomeData,
        analyticsSummary,
        refreshData,
        loading,
      }}
    >
      <div className="relative min-h-screen w-full">
        {/* Full Page Loader with Glassmorphism and Fade-out Animation */}
        {showLoaderUI && userId && (
          <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0c10] text-white p-6 transition-opacity duration-500 ease-out select-none ${
              fadeLoader ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Background elements */}
            <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Content card */}
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-6">
              {/* App Logo Indicator */}
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_30px_rgba(168,85,247,0.15)] animate-pulse">
                <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">ST</span>
              </div>

              {error ? (
                // Error State inside Loader
                <div className="space-y-6 w-full animate-fade-in">
                  <div className="flex flex-col items-center space-y-2">
                    <AlertCircle className="h-12 w-12 text-rose-500" />
                    <h3 className="text-lg font-black text-rose-400">Sync Failure</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      onClick={handleRetry}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Synchronisation
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-xs font-bold text-foreground hover:bg-secondary/40 active:scale-95 transition-all w-full"
                    >
                      Refresh Page
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-rose-500/10 hover:bg-rose-500/20 px-4 py-3 text-xs font-bold text-rose-400 active:scale-95 transition-all w-full"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                // Sync / Loading state
                <div className="space-y-6 w-full">
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight">Student Expense Tracker</h2>
                    <p className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground animate-pulse">
                      Loading Financial Data...
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-3 w-full">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-purple-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{loadingStep}...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Fade-in Container */}
        <div
          className={`transition-opacity duration-500 ease-out ${
            isAppFinancialDataReady && userId ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {isAppFinancialDataReady && children}
        </div>

        {/* Guest fallback or layout when session is completely empty (e.g. login pages) */}
        {!userId && !sessionLoading && children}
      </div>
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}
