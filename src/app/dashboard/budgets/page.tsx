'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  X,
  PiggyBank,
  DollarSign,
  TrendingUp,
  MapPin,
  TrendingDown,
  Info,
  Users,
  Compass,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getBudgetsWithUsageAction,
  createBudgetAction,
  updateBudgetAction,
  deleteBudgetAction,
} from '@/controllers/budget.controller';
import { getProfileAction } from '@/controllers/profile.controller';
import { getLocationCostDetailsAction } from '@/controllers/cost-of-living.controller';
import { getSavingsGoalsAction } from '@/controllers/savings-goal.controller';
import { getExpectedMonthlyIncomeAction } from '@/controllers/income.controller';
import { BudgetWithUsage } from '@/services/budget.service';
import { EXPENSE_CATEGORIES } from '@/models/expense.model';
import { useCurrency } from '@/hooks/use-currency';
import { useFinancialData } from '@/components/providers/financial-data-provider';
import { CurrencyDisplay } from '@/components/dashboard/currency-display';

interface ProfileData {
  cityOfStudy: string | null;
  countryOfStudy: string | null;
  monthlyIncome: number;
}

interface CostOfLivingDetails {
  estimatedMonthlyCost: number;
  breakdown: {
    rent: number;
    food: number;
    transport: number;
    utilities: number;
    internet: number;
    healthcare: number;
    entertainment: number;
  };
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export default function BudgetsPage() {
  const { format, formatHome, currencyCode } = useCurrency();
  const {
    isAppFinancialDataReady,
    profile: globalProfile,
    budgets: globalBudgets,
    savingsGoals: globalSavingsGoals,
    expectedIncomeData: globalExpectedIncomeData,
    refreshData,
  } = useFinancialData();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetWithUsage[] | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [costDetails, setCostDetails] = useState<CostOfLivingDetails | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[] | null>(null);
  const [expectedIncomeData, setExpectedIncomeData] = useState<{
    expectedIncome: number | null;
    receivedIncome: number | null;
    remainingExpected: number | null;
  }>({
    expectedIncome: null,
    receivedIncome: null,
    remainingExpected: null,
  });
  const [isBudgetsLoaded, setIsBudgetsLoaded] = useState(false);
  const [isIncomeLoaded, setIsIncomeLoaded] = useState(false);
  const [isSavingsLoaded, setIsSavingsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Message states
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithUsage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formCategory, setFormCategory] = useState('Food');
  const [formAmount, setFormAmount] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [validationError, setValidationError] = useState('');

  // Fetch session user
  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Sync data immediately when financial data context resolves or updates
  useEffect(() => {
    if (isAppFinancialDataReady) {
      setBudgets(globalBudgets);
      setProfile(globalProfile as any);
      setSavingsGoals(globalSavingsGoals as any);
      setExpectedIncomeData({
        expectedIncome: globalExpectedIncomeData?.expectedIncome ?? null,
        receivedIncome: globalExpectedIncomeData?.receivedIncome ?? null,
        remainingExpected: globalExpectedIncomeData?.remainingExpected ?? null,
      });
      setIsBudgetsLoaded(true);
      setIsIncomeLoaded(true);
      setIsSavingsLoaded(true);
      setLoading(false);
    }
  }, [isAppFinancialDataReady, globalBudgets, globalProfile, globalSavingsGoals, globalExpectedIncomeData]);

  // Fetch Cost of Living details based on synchronized profile
  useEffect(() => {
    const fetchCol = async () => {
      const city = globalProfile?.cityOfStudy || (globalProfile as any)?.studyCity;
      const country = globalProfile?.countryOfStudy || (globalProfile as any)?.studyCountry;
      if (city && country) {
        const colResult = await getLocationCostDetailsAction(city, country);
        if (colResult.success && colResult.data) {
          setCostDetails(colResult.data as any);
        }
      }
    };
    if (isAppFinancialDataReady && globalProfile) {
      fetchCol();
    }
  }, [isAppFinancialDataReady, globalProfile]);

  // Fetch all dashboard data dynamically (acts as bg sync trigger)
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await refreshData();
    setLoading(false);
  }, [refreshData]);

  // Helper: Get City-Based Recommendation Breakdown
  const getCityRecommendations = (): Record<string, number> => {
    const defaultCityTotal = 1850;
    const baseTotal = costDetails ? costDetails.estimatedMonthlyCost : defaultCityTotal;

    // Standard multipliers matching the Melbourne guides and COL ratios
    return {
      'Hostel/Rent': Math.round(baseTotal * 0.324),
      'Food': Math.round(baseTotal * 0.27),
      'Entertainment': Math.round(baseTotal * 0.097),
      'Transport': Math.round(baseTotal * 0.081),
      'Education': Math.round(baseTotal * 0.065),
      'Shopping': Math.round(baseTotal * 0.054),
      'Miscellaneous': Math.round(baseTotal * 0.054),
      'Health': Math.round(baseTotal * 0.032),
      'Subscriptions': Math.round(baseTotal * 0.023),
    };
  };

  const recommendations = getCityRecommendations();
  const totalRecommended = Object.values(recommendations).reduce((sum, val) => sum + val, 0);

  // Helper: Get Peer Benchmarks ("Students Like You")
  const getPeerBenchmarks = (): Record<string, number> => {
    const baseTotal = costDetails ? costDetails.estimatedMonthlyCost : 1850;
    // Slightly adjusted benchmarks representing peer averages
    return {
      'Food': Math.round(baseTotal * 0.26),
      'Transport': Math.round(baseTotal * 0.076),
      'Entertainment': Math.round(baseTotal * 0.092),
      'Total': Math.round(baseTotal * 0.973),
    };
  };

  const peerBenchmarks = getPeerBenchmarks();

  // Calculations & States guard
  const isFinancialDataReady = isBudgetsLoaded && isIncomeLoaded && budgets !== null && expectedIncomeData.expectedIncome !== null;

  const totalBudgeted = isFinancialDataReady && budgets ? budgets.reduce((sum, b) => sum + b.amount, 0) : null;
  const totalSpent = isFinancialDataReady && budgets ? budgets.reduce((sum, b) => sum + b.usedAmount, 0) : null;
  const totalRemaining = isFinancialDataReady && budgets ? budgets.reduce((sum, b) => sum + b.remainingAmount, 0) : null;
  const overallUtilization = isFinancialDataReady && totalBudgeted && totalBudgeted > 0 ? Math.round((totalSpent! / totalBudgeted) * 100) : null;

  // Date utilities
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Risk Prediction & Run rate helpers
  const getRunRateProjection = (spent: number) => {
    if (currentDay <= 1) return spent;
    return Number((spent * (daysInMonth / currentDay)).toFixed(2));
  };

  // Alerts, Health Score & Risk Predictions Calculations
  const processedCategoryStats = isFinancialDataReady && budgets
    ? EXPENSE_CATEGORIES.map((category) => {
        const activeBudget = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase());
        const budgetLimit = activeBudget ? activeBudget.amount : 0;
        const currentSpent = activeBudget ? activeBudget.usedAmount : 0;
        const remaining = activeBudget ? activeBudget.remainingAmount : 0;
        const pctUsed = budgetLimit > 0 ? Math.round((currentSpent / budgetLimit) * 100) : 0;
        const recommended = recommendations[category] || 0;

        const projectedMonthEnd = getRunRateProjection(currentSpent);
        
        // Status Logic
        let status: 'Healthy' | 'Warning' | 'Exceeded' = 'Healthy';
        if (pctUsed >= 100) status = 'Exceeded';
        else if (pctUsed >= 80) status = 'Warning';

        // Risk Logic
        let riskStatus: 'On Track' | 'Likely Over Budget' = 'On Track';
        if (budgetLimit > 0 && projectedMonthEnd > budgetLimit) {
          riskStatus = 'Likely Over Budget';
        }

        return {
          category,
          budgetLimit,
          recommended,
          currentSpent,
          remaining,
          pctUsed,
          status,
          projectedMonthEnd,
          riskStatus,
          activeBudget,
        };
      })
    : [];

  // Dynamic Budget Health Score calculation
  const calculateHealthScore = () => {
    if (!isFinancialDataReady || !budgets) return null;
    if (budgets.length === 0) return 100;
    let score = 100;

    // 1. Budget Adherence: Deduct if overall utilization is high
    if (overallUtilization && overallUtilization > 100) score -= 30;
    else if (overallUtilization && overallUtilization > 90) score -= 15;
    else if (overallUtilization && overallUtilization > 80) score -= 5;

    // 2. Overspending frequency: Deduct per exceeded category
    const exceededCount = processedCategoryStats.filter((c) => c.status === 'Exceeded').length;
    score -= exceededCount * 10;

    // 3. Warnings: Deduct per warning category
    const warningCount = processedCategoryStats.filter((c) => c.status === 'Warning').length;
    score -= warningCount * 4;

    // 4. Run Rate Risk: Deduct if predicted to go over budget
    const atRiskCount = processedCategoryStats.filter((c) => c.riskStatus === 'Likely Over Budget').length;
    score -= atRiskCount * 5;

    // 5. Expected Monthly Income vs Budget allocation validation
    const expected = expectedIncomeData.expectedIncome!;
    if (totalBudgeted! > expected) {
      score -= 25; // Significant penalty for allocating more than expected income
    } else if (totalBudgeted! > expected * 0.9) {
      score -= 10; // Penalty for allocating close to expected income
    }

    return Math.max(0, Math.min(100, score));
  };

  const healthScore = isFinancialDataReady ? calculateHealthScore() : null;
  const getHealthStatus = (score: number | null) => {
    if (score === null) return { label: 'Calculating...', color: 'text-muted-foreground animate-pulse' };
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 75) return { label: 'Good', color: 'text-amber-400' };
    if (score >= 60) return { label: 'Needs Improvement', color: 'text-orange-400' };
    return { label: 'At Risk', color: 'text-rose-400' };
  };
  const healthDetails = getHealthStatus(healthScore);

  // Dynamic Savings Goal Widget calculations
  const primaryGoal = savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null;
  const savingsGoalValue = primaryGoal ? primaryGoal.targetAmount : null;
  const currentSavingsValue = primaryGoal ? primaryGoal.currentAmount : null;
  const savingsGoalPct = savingsGoalValue && savingsGoalValue > 0 && currentSavingsValue !== null ? Math.round((currentSavingsValue / savingsGoalValue) * 100) : 0;

  // Dynamic Month-End projections
  const totalPredictedSpent = isFinancialDataReady ? processedCategoryStats.reduce((sum, c) => sum + (c.budgetLimit > 0 ? c.projectedMonthEnd : c.currentSpent), 0) : null;
  const expectedMonthEndBalance = isFinancialDataReady && expectedIncomeData.expectedIncome !== null && totalPredictedSpent !== null ? Math.max(0, expectedIncomeData.expectedIncome - totalPredictedSpent) : null;
  const expectedSavings = expectedMonthEndBalance;
  const projectedBudgetUsage = isFinancialDataReady && totalBudgeted && totalBudgeted > 0 && totalPredictedSpent !== null ? Math.round((totalPredictedSpent / totalBudgeted) * 100) : null;

  // Budget Validation Engine status
  const budgetCushion = isFinancialDataReady && expectedIncomeData.expectedIncome !== null && totalBudgeted !== null
    ? expectedIncomeData.expectedIncome - totalBudgeted
    : null;

  let budgetValidationState: 'Healthy' | 'Warning' | 'Over-Budget' | null = null;
  if (isFinancialDataReady) {
    const expected = expectedIncomeData.expectedIncome!;
    if (totalBudgeted! > expected) {
      budgetValidationState = 'Over-Budget';
    } else if (totalBudgeted! > expected * 0.9) {
      budgetValidationState = 'Warning';
    } else {
      budgetValidationState = 'Healthy';
    }
  }

  // Safe formatting helper to prevent UI crashes while loading
  const formatOrLoading = (val: number | null, fallback = 'Calculating...') => {
    return val !== null ? format(val) : fallback;
  };

  // Alerts List
  const alertsList = processedCategoryStats
    .filter((c) => c.budgetLimit > 0 && (c.status !== 'Healthy' || c.riskStatus === 'Likely Over Budget'))
    .map((c) => {
      if (c.status === 'Exceeded') {
        return {
          text: `${c.category} budget exceeded by ${format(c.currentSpent - c.budgetLimit)}.`,
          type: 'Exceeded',
        };
      } else if (c.status === 'Warning') {
        return {
          text: `${c.category} budget is ${c.pctUsed}% utilized.`,
          type: 'Warning',
        };
      } else {
        return {
          text: `${c.category} is projected to go over budget by month-end.`,
          type: 'Warning',
        };
      }
    });

  // AI Recommendations
  const getAIRecommendations = () => {
    const recs: string[] = [];
    const city = profile?.cityOfStudy || 'Melbourne';

    processedCategoryStats.forEach((c) => {
      if (c.budgetLimit > 0) {
        if (c.budgetLimit > c.recommended * 1.2 && c.status === 'Healthy') {
          recs.push(`Based on ${city} student spending patterns: Reduce your ${c.category} budget by ${format(c.budgetLimit - c.recommended)} to allocate elsewhere.`);
        }
        if (c.status === 'Exceeded' || c.riskStatus === 'Likely Over Budget') {
          recs.push(`You are overspending on ${c.category}. Increase limit by ${format(c.recommended - c.budgetLimit > 0 ? c.recommended - c.budgetLimit : 50)} or consider cutting down cafe/casual purchases.`);
        }
      }
    });

    if (recs.length === 0) {
      recs.push(`Your budgets are fully aligned with ${city} student spending benchmarks! Keep up the excellent work.`);
      recs.push(`You could save an additional ${format(100)} this month by trimming subscriptions or using student transport discounts.`);
    }

    return recs;
  };

  const aiRecommendations = getAIRecommendations();

  // Smart Bulk initialization of City recommended budgets
  const handleBulkInitialize = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Delete existing budgets first for current month to avoid conflicts
      for (const b of (budgets || [])) {
        await deleteBudgetAction(b.id, userId);
      }

      // Create new budgets for all 9 categories based on recommendations
      for (const category of EXPENSE_CATEGORIES) {
        const payload = {
          category,
          amount: recommendations[category] || 100,
          startDate: firstDay,
          endDate: lastDay,
        };
        await createBudgetAction(userId, payload);
      }

      setMessage({ type: 'success', text: 'Smart budget successfully initialized with city benchmarks!' });
      fetchAllData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to initialize bulk budget:', err);
      setMessage({ type: 'error', text: 'Failed to initialize recommended budget.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit budget (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive budget amount.');
      return;
    }
    if (new Date(formStartDate) > new Date(formEndDate)) {
      setValidationError('End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const payload = {
      category: formCategory,
      amount: parsedAmount,
      startDate: formStartDate,
      endDate: formEndDate,
    };

    let result;
    if (modalMode === 'create') {
      // Check if active budget already exists for this category to avoid server error
      const existing = budgets?.find((b) => b.category.toLowerCase() === formCategory.toLowerCase());
      if (existing) {
        result = await updateBudgetAction(existing.id, userId, payload);
      } else {
        result = await createBudgetAction(userId, payload);
      }
    } else if (modalMode === 'edit' && selectedBudget) {
      result = await updateBudgetAction(selectedBudget.id, userId, payload);
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Budget successfully ${modalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsModalOpen(false);
      fetchAllData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save changes.');
    }
  };

  // Delete budget
  const handleDeleteBudget = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this budget limit?')) return;
    setLoading(true);
    const result = await deleteBudgetAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Budget successfully deleted.' });
      fetchAllData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete budget.' });
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit', record?: BudgetWithUsage) => {
    setModalMode(mode);
    setValidationError('');
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    if (record) {
      setSelectedBudget(record);
      setFormCategory(record.category);
      setFormAmount(record.amount.toString());
      setFormStartDate(record.startDate);
      setFormEndDate(record.endDate);
    } else {
      setSelectedBudget(null);
      setFormCategory('Food');
      setFormAmount('');
      setFormStartDate(firstDay);
      setFormEndDate(lastDay);
    }
    setIsModalOpen(true);
  };

  // Recharts format
  const chartData = processedCategoryStats
    .filter((c) => c.budgetLimit > 0)
    .map((c) => ({
      name: c.category,
      Budget: c.budgetLimit,
      Spent: c.currentSpent,
    }));

  // Recharts Peer comparison format
  const peerComparisonChartData = [
    {
      name: 'Food',
      'Your Budget': processedCategoryStats.find((c) => c.category === 'Food')?.budgetLimit || 0,
      'Student Average': peerBenchmarks.Food,
    },
    {
      name: 'Transport',
      'Your Budget': processedCategoryStats.find((c) => c.category === 'Transport')?.budgetLimit || 0,
      'Student Average': peerBenchmarks.Transport,
    },
    {
      name: 'Entertainment',
      'Your Budget': processedCategoryStats.find((c) => c.category === 'Entertainment')?.budgetLimit || 0,
      'Student Average': peerBenchmarks.Entertainment,
    },
  ];

  // Loading screen
  if (!userId && loading) {
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
        <p className="text-sm text-muted-foreground">Please sign in to view your Smart Budget Planning dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Smart Budget Planner</h2>
          <p className="text-sm text-muted-foreground">
            Plan your spending using city-based cost guides and intelligent benchmarks.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          {isFinancialDataReady && budgets && budgets.length === 0 && (
            <button
              onClick={handleBulkInitialize}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-500/20 border border-purple-500/30 px-4 py-2.5 text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all active:scale-95 shadow-sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Use Recommended City Budget
            </button>
          )}
          <button
            onClick={() => openModal('create')}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            <Plus className="h-4 w-4" />
            Create Budget
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
          }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Budget Validation Alert Banner */}
      {isFinancialDataReady && budgetValidationState !== 'Healthy' && budgetValidationState !== null && (
        <div
          className={`p-4 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            budgetValidationState === 'Over-Budget'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">
                {budgetValidationState === 'Over-Budget' ? 'Over-Budget Alert' : 'Close to Expected Income'}
              </p>
              <p className="text-xs opacity-90">
                {budgetValidationState === 'Over-Budget'
                  ? `Your total budgeted amount (${formatOrLoading(totalBudgeted)}) exceeds your expected monthly income (${formatOrLoading(expectedIncomeData.expectedIncome)}) by ${formatOrLoading(totalBudgeted !== null && expectedIncomeData.expectedIncome !== null ? totalBudgeted - expectedIncomeData.expectedIncome : null)}.`
                  : `Your total budgeted amount (${formatOrLoading(totalBudgeted)}) uses over 90% of your expected monthly income (${formatOrLoading(expectedIncomeData.expectedIncome)}).`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-current shrink-0">
            Health Score Penalized
          </span>
        </div>
      )}

      {/* 1. Monthly Budget Overview Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expected Income</p>
            {isFinancialDataReady ? (
              <CurrencyDisplay amount={expectedIncomeData.expectedIncome ?? 0} primaryClassName="text-2xl font-black mt-2 text-foreground" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
            ) : (
              <div className="h-8 w-24 bg-secondary/50 animate-pulse rounded-lg mt-2" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 flex items-baseline gap-1">
            <span>Received:</span>
            {isFinancialDataReady ? (
              <CurrencyDisplay amount={expectedIncomeData.receivedIncome ?? 0} inline={true} primaryClassName="font-semibold text-foreground" secondaryClassName="text-[9px] text-muted-foreground" />
            ) : (
              <span>Calculating...</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Budgeted</p>
            {isFinancialDataReady ? (
              <CurrencyDisplay amount={totalBudgeted ?? 0} primaryClassName="text-2xl font-black mt-2 text-foreground" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
            ) : (
              <div className="h-8 w-24 bg-secondary/50 animate-pulse rounded-lg mt-2" />
            )}
          </div>
          <div className="mt-2 flex items-center">
            {isFinancialDataReady && budgetValidationState ? (
              <span
                className={`text-[9px] font-bold rounded-lg px-2 py-0.5 border ${
                  budgetValidationState === 'Over-Budget'
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    : budgetValidationState === 'Warning'
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                }`}
              >
                {budgetValidationState}
              </span>
            ) : (
              <div className="h-4 w-16 bg-secondary/50 animate-pulse rounded-lg" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {!isFinancialDataReady ? 'Budget Cushion' : (budgetCushion !== null && budgetCushion >= 0 ? 'Budget Cushion' : 'Budget Deficit')}
            </p>
            {isFinancialDataReady ? (
              <CurrencyDisplay
                amount={budgetCushion !== null ? Math.abs(budgetCushion) : 0}
                primaryClassName={`text-2xl font-black mt-2 ${
                  budgetCushion !== null && budgetCushion >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
                secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block"
              />
            ) : (
              <div className="h-8 w-24 bg-secondary/50 animate-pulse rounded-lg mt-2" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {!isFinancialDataReady ? 'Calculating...' : (budgetCushion !== null && budgetCushion >= 0 ? 'Unallocated income' : 'Exceeds expected income')}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</p>
            {isFinancialDataReady ? (
              <CurrencyDisplay amount={totalSpent ?? 0} primaryClassName="text-2xl font-black mt-2 text-foreground" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
            ) : (
              <div className="h-8 w-24 bg-secondary/50 animate-pulse rounded-lg mt-2" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Tracked transactions</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px] col-span-2 md:col-span-1">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Budget Used</p>
            {isFinancialDataReady && overallUtilization !== null ? (
              <h4 className="text-2xl font-black mt-2">{overallUtilization}%</h4>
            ) : (
              <div className="h-8 w-20 bg-secondary/50 animate-pulse rounded-lg mt-2" />
            )}
          </div>
          {isFinancialDataReady && overallUtilization !== null ? (
            <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  overallUtilization >= 90
                    ? 'bg-rose-500'
                    : overallUtilization >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallUtilization)}%` }}
              />
            </div>
          ) : (
            <div className="h-1.5 w-full bg-secondary/50 animate-pulse rounded-full mt-2" />
          )}
        </div>
      </div>

      {/* Main Grid: Health Score + COL Insights + Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 2. Budget Health Score Card */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-all duration-300" />
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Budget Health Score</h3>
              <p className="text-xs text-muted-foreground">Adherence & performance scoring</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-2.5 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="my-6 flex flex-col items-center justify-center space-y-2">
            <div className="relative flex items-center justify-center w-28 h-28">
              {/* Outer circular visual */}
              <div className="absolute inset-0 rounded-full border-4 border-secondary/30" />
              {isFinancialDataReady && healthScore !== null ? (
                <>
                  <div
                    className={`absolute inset-0 rounded-full border-4 border-primary transition-all duration-500`}
                    style={{
                      clipPath: `polygon(50% 50%, -50% -50%, ${healthScore}% -50%, ${healthScore}% 150%, -50% 150%)`,
                      transform: 'rotate(-90deg)',
                    }}
                  />
                  <span className="text-3xl font-black">{healthScore}</span>
                </>
              ) : (
                <div className="h-20 w-20 rounded-full bg-secondary/30 animate-pulse flex items-center justify-center">
                  <span className="text-xs text-muted-foreground animate-pulse">...</span>
                </div>
              )}
            </div>
            <p className={`text-base font-bold uppercase tracking-wider ${healthDetails.color}`}>
              {healthDetails.label}
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-3 border-t border-border/50">
            Based on category performance, overspending frequency, and budget adherence.
          </div>
        </div>

        {/* 3. City-Based Budget Insights Guide */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-1.5">
                <MapPin className="h-4.5 w-4.5 text-primary" />
                {profile?.cityOfStudy || 'Melbourne'} Guide
              </h3>
              <p className="text-xs text-muted-foreground">City cost of living recommendations</p>
            </div>
            <span className="text-xs rounded-lg bg-secondary/50 px-2.5 py-1 font-bold text-foreground">
              {profile?.countryOfStudy || 'Australia'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[190px] pr-1">
            {Object.entries(recommendations).map(([cat, val]) => (
              <div key={cat} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{cat}</span>
                <CurrencyDisplay amount={val} inline={true} primaryClassName="font-bold text-foreground" secondaryClassName="text-[10px] text-muted-foreground font-semibold" />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center text-xs font-semibold">
            <span className="text-muted-foreground">Recommended Monthly Total:</span>
            <CurrencyDisplay amount={totalRecommended} inline={true} primaryClassName="text-primary font-extrabold text-sm" secondaryClassName="text-[10px] text-muted-foreground font-semibold" />
          </div>
        </div>

        {/* 7. Budget Alerts & Alerts List */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-primary" />
              Budget Alerts
            </h3>
            <p className="text-xs text-muted-foreground">System notifications and warning reports</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 mt-4 pr-1 max-h-[220px]">
            {alertsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-1.5 py-10">
                <Check className="h-8 w-8 text-emerald-400" />
                <p className="text-xs font-bold text-emerald-400">All Budgets Healthy</p>
                <p className="text-[10px] text-muted-foreground">No alerts or warnings active.</p>
              </div>
            ) : (
              alertsList.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                    alert.type === 'Exceeded'
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{alert.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Smart Category Budget Cards */}
      <div>
        <div className="mb-4">
          <h3 className="font-bold text-lg">Category Budgets</h3>
          <p className="text-xs text-muted-foreground">Interactive status tracking against target limits</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isFinancialDataReady ? (
            processedCategoryStats.map((item) => {
              const hasBudget = item.budgetLimit > 0;
              return (
                <div
                  key={item.category}
                  className={`rounded-2xl border bg-card/30 p-5 space-y-4 backdrop-blur-sm transition-all relative ${
                    hasBudget
                      ? item.status === 'Exceeded'
                        ? 'border-rose-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.05)]'
                        : item.status === 'Warning'
                        ? 'border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.05)]'
                        : 'border-border hover:border-primary/35 shadow-sm'
                      : 'border-dashed border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base text-foreground">{item.category}</h4>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-baseline gap-1">
                        <span>Recommended:</span>
                        <CurrencyDisplay amount={item.recommended} inline={true} primaryClassName="text-foreground font-bold" secondaryClassName="text-[9px] text-muted-foreground font-medium" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasBudget ? (
                        <>
                          <button
                            onClick={() => openModal('edit', item.activeBudget)}
                            className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(item.activeBudget!.id)}
                            className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setFormCategory(item.category);
                            setFormAmount(item.recommended.toString());
                            openModal('create');
                          }}
                          className="flex items-center gap-1 rounded-lg bg-primary/20 hover:bg-primary/30 px-2.5 py-1 text-[10px] font-bold text-primary transition-all cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Setup
                        </button>
                      )}
                    </div>
                  </div>

                  {hasBudget ? (
                    <div className="space-y-3">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Your Budget</span>
                          <CurrencyDisplay amount={item.budgetLimit} inline={true} primaryClassName="font-bold text-foreground" secondaryClassName="text-[10px] text-muted-foreground font-medium" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Spent</span>
                          <CurrencyDisplay amount={item.currentSpent} inline={true} primaryClassName="font-bold text-foreground" secondaryClassName="text-[10px] text-muted-foreground font-medium" />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.status === 'Exceeded'
                              ? 'bg-rose-500'
                              : item.status === 'Warning'
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, item.pctUsed)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <div className="flex items-baseline gap-1">
                          <span className="text-muted-foreground">Remaining:</span>
                          <CurrencyDisplay amount={item.remaining} inline={true} primaryClassName="text-foreground font-bold" secondaryClassName="text-[9px] text-muted-foreground font-medium" />
                        </div>
                        <span className="text-primary">{item.pctUsed}% Used</span>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] font-bold">
                        <span className="text-muted-foreground">Status:</span>
                        <span
                          className={
                            item.status === 'Exceeded'
                              ? 'text-rose-400'
                              : item.status === 'Warning'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {item.status === 'Exceeded'
                            ? 'Exceeded'
                            : item.status === 'Warning'
                            ? 'Warning'
                            : 'Healthy'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground space-y-1">
                      <Info className="h-5 w-5 opacity-40" />
                      <p className="font-bold">No Active Budget Limit</p>
                      <p className="text-[10px]">Initialize category using local recommended standards.</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-2xl border border-border bg-card/30 p-5 space-y-4 backdrop-blur-sm animate-pulse">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="h-5 w-24 bg-secondary/50 rounded-lg" />
                    <div className="h-3 w-32 bg-secondary/40 rounded mt-1.5" />
                  </div>
                  <div className="h-6 w-12 bg-secondary/50 rounded-lg" />
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-secondary/40 rounded" />
                      <div className="h-4 w-12 bg-secondary/50 rounded" />
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <div className="h-3 w-16 bg-secondary/40 rounded" />
                      <div className="h-4 w-12 bg-secondary/50 rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-secondary/40 rounded-full" />
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-20 bg-secondary/40 rounded" />
                    <div className="h-3 w-12 bg-secondary/40 rounded" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grid: Charts + Savings Goals */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recharts Budget vs actual Bar Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px]">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Budget vs actual Spent</h3>
            <p className="text-xs text-muted-foreground">Detailed visual performance of spending across target limits</p>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            {!isFinancialDataReady ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground space-y-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span>Loading metrics...</span>
              </div>
            ) : mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                  <XAxis dataKey="name" stroke="#8b8b9a" fontSize={11} tickLine={false} />
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
                  <Bar dataKey="Budget" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No active budget categories to display metrics. Setup limits to chart performance.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Savings Progress + Run Rate risk + Month-End + AI Recommendations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 8. Savings Goal Progress */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-1.5">
              <PiggyBank className="h-4.5 w-4.5 text-primary" />
              Savings Goal Progress
            </h3>
            <p className="text-xs text-muted-foreground">Monthly goal targets</p>
          </div>

          {!isSavingsLoaded || savingsGoals === null ? (
            <div className="space-y-4 my-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 bg-secondary/50 rounded" />
                <div className="h-3.5 w-24 bg-secondary/50 rounded" />
              </div>
              <div className="h-3 w-full bg-secondary/50 rounded-full" />
              <div className="flex justify-between">
                <div className="h-3.5 w-28 bg-secondary/50 rounded" />
                <div className="h-3.5 w-16 bg-secondary/50 rounded" />
              </div>
            </div>
          ) : savingsGoals.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <PiggyBank className="h-8 w-8 text-muted-foreground/45" />
              <p className="font-semibold">No Active Savings Goals</p>
              <p className="text-[10px] max-w-[160px]">Create goals on the Dashboard to track progress.</p>
            </div>
          ) : (
            <div className="space-y-4 my-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">
                  Target: <strong className="text-foreground">{formatOrLoading(savingsGoalValue)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Current: <strong className="text-foreground">{formatOrLoading(currentSavingsValue)}</strong>
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-secondary/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, savingsGoalPct)}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-muted-foreground font-semibold">
                  Remaining: <span className="text-primary font-bold">{formatOrLoading(savingsGoalValue !== null && currentSavingsValue !== null ? Math.max(0, savingsGoalValue - currentSavingsValue) : null)}</span>
                </span>
                <span className="text-primary">
                  {savingsGoalPct}% Completed
                </span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center border-t border-border/40 pt-2.5">
            Based on active goals configured in the Savings Goal manager.
          </p>
        </div>

        {/* 9. Budget Risk Prediction Widget */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
              Budget Risk Prediction
            </h3>
            <p className="text-xs text-muted-foreground">Month-end projected category totals</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4 max-h-[160px] pr-1">
            {!isFinancialDataReady ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="h-4 w-20 bg-secondary/50 rounded" />
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-16 bg-secondary/40 rounded" />
                    <div className="h-5 w-16 bg-secondary/50 rounded-lg" />
                  </div>
                </div>
              ))
            ) : processedCategoryStats.filter((c) => c.budgetLimit > 0).map((c) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{c.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Proj: {format(c.projectedMonthEnd)}</span>
                    <span
                      className={`font-semibold text-[10px] rounded-lg px-2 py-0.5 border ${
                        c.riskStatus === 'Likely Over Budget'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {c.riskStatus}
                    </span>
                  </div>
                </div>
              ))}
            {isFinancialDataReady && budgets && budgets.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-10">No active budgets to project risk.</p>
            )}
          </div>
        </div>

        {/* 11. Expected Month-End Summary Card */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-all duration-300" />
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Expected Month-End Summary</h3>
              <p className="text-xs text-muted-foreground">Projections based on daily run rate</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-2.5 text-primary">
              <Compass className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3.5 my-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Expected Month-End Balance</span>
              <span className="font-bold text-foreground">{formatOrLoading(expectedMonthEndBalance)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Expected Savings</span>
              <span className="font-bold text-emerald-400">{formatOrLoading(expectedSavings)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Projected Budget Usage</span>
              <span className="font-bold text-foreground">{projectedBudgetUsage !== null ? `${projectedBudgetUsage}%` : 'Calculating...'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 text-[10px] text-center text-muted-foreground">
            Using expected monthly income {formatOrLoading(expectedIncomeData.expectedIncome)}.
          </div>
        </div>
      </div>



      {/* Modal - Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {modalMode === 'create' ? 'Create Budget' : 'Edit Budget Limit'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalCategory">
                  Category
                </label>
                <select
                  id="modalCategory"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={modalMode === 'edit'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalAmount">
                  Budget Limit ({currencyCode})
                </label>
                <input
                  id="modalAmount"
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalStartDate">
                  Start Date
                </label>
                <input
                  id="modalStartDate"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalEndDate">
                  End Date
                </label>
                <input
                  id="modalEndDate"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Budget'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
