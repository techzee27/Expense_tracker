'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  Check,
  X,
  Target,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart2,
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { ChatAssistant } from '@/components/dashboard/chat-assistant';
import { getExpensesAction } from '@/controllers/expense.controller';
import { getProfileAction } from '@/controllers/profile.controller';
import { getIncomesAction } from '@/controllers/income.controller';
import { getAnalyticsSummaryAction } from '@/controllers/analytics.controller';
import {
  getSavingsGoalsAction,
  createSavingsGoalAction,
  updateSavingsGoalAction,
  deleteSavingsGoalAction,
} from '@/controllers/savings-goal.controller';
import { learnUserPreferenceAction } from '@/controllers/hindsight.controller';
import { SavingsGoalWithPercent } from '@/services/savings-goal.service';
import { Expense } from '@/models/expense.model';
import { useCurrency } from '@/hooks/use-currency';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow';
import { CurrencyDisplay } from '@/components/dashboard/currency-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChartFilter } from '@/hooks/use-chart-filter';

export default function DashboardPage() {
  const { format, formatHome, currencyCode, refreshCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('Student');
  const [loading, setLoading] = useState(true);

  // Financial data
  interface TrendInfo {
    value: number;
    isPositive: boolean;
  }
  const [stats, setStats] = useState<{
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    incomeTrend?: TrendInfo;
    expenseTrend?: TrendInfo;
    savingsTrend?: TrendInfo;
    rateTrend?: TrendInfo;
  }>({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Expense[]>([]);
  const [chartData, setChartData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // useChartFilter hook
  const [timeRange, setTimeRange, isInitialized] = useChartFilter('overview-chart', 'month');

  // Savings goals
  const [goals, setGoals] = useState<SavingsGoalWithPercent[]>([]);

  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Goal modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalWithPercent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI Intelligence States
  const [aiLoading, setAiLoading] = useState(true);
  const [aiData, setAiData] = useState<any>(null);
  const [aiFeedback, setAiFeedback] = useState<Record<string, 'like' | 'dislike'>>({});

  // Onboarding States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingProgressStep, setOnboardingProgressStep] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [showSessionReminderModal, setShowSessionReminderModal] = useState(false);

  // Goal Form states
  const [formName, setFormName] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('0');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [validationError, setValidationError] = useState('');

  // Fetch session user on mount and check onboarding status
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || 'Student');

        // Check if user has completed onboarding in their database profile record
        const profileResult = await getProfileAction(user.id);
        if (profileResult.success && profileResult.data) {
          const profileData = profileResult.data;
          setOnboardingCompleted(!!profileData.onboardingCompleted);

          // Force setup if URL query param setup=true is specified
          const forceSetup = searchParams.get('setup') === 'true';

          if (!profileData.onboardingCompleted || forceSetup) {
            // Check if they completed splash screens. If yes, resume from wizard.
            if (profileData.introScreensCompleted || forceSetup) {
              const startStep = (profileData.lastCompletedStep || 0) + 5;
              setOnboardingProgressStep(Math.min(11, Math.max(5, startStep)));
              setShowOnboarding(true);
            } else {
              // Start from splash slide 0
              setOnboardingProgressStep(0);
              setShowOnboarding(true);
            }
          } else {
            // Onboarding completed, do not show onboarding
            setShowOnboarding(false);
          }

          // Handle session reminder modal logic if onboarding was skipped/not completed
          if (!profileData.onboardingCompleted && !forceSetup) {
            const hasDismissedReminder = sessionStorage.getItem('dismissed-onboarding-reminder') === 'true';
            if (!hasDismissedReminder) {
              setShowSessionReminderModal(true);
            }
          }
        }
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, [searchParams]);

  // Fetch all dashboard data dynamically
  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1. Fetch profile for monthlyIncome
      let expectedMonthlyIncome = 0;
      const profileResult = await getProfileAction(userId);
      if (profileResult.success && profileResult.data) {
        expectedMonthlyIncome = profileResult.data.monthlyIncome || 0;
      }

      // 2. Fetch expenses
      const expenseResult = await getExpensesAction(userId, { limit: 1000 }); // fetch up to 1000 for stats calculation
      let totalExpense = 0;
      let recents: Expense[] = [];

      if (expenseResult.success && expenseResult.data) {
        const list = expenseResult.data.expenses;
        recents = list.slice(0, 5);
        list.forEach((tx) => {
          totalExpense += tx.amount;
        });
      }

      // 3. Fetch incomes
      const incomeResult = await getIncomesAction(userId, { limit: 1000 });
      let totalIncome = 0;
      if (incomeResult.success && incomeResult.data) {
        incomeResult.data.incomes.forEach((inc) => {
          totalIncome += inc.amount;
        });
      }

      // Fallback to expected monthly income settings if no income transactions are found
      if (totalIncome === 0) {
        totalIncome = expectedMonthlyIncome;
      }

      // Calculate monthly comparison details (trends vs last month)
      let prevMonthIncome = 0;
      let prevMonthExpense = 0;
      const now = new Date();
      const currentMonthStr = now.toISOString().substring(0, 7); // YYYY-MM
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      const lastMonthStr = lastMonthDate.toISOString().substring(0, 7); // YYYY-MM

      if (expenseResult.success && expenseResult.data) {
        expenseResult.data.expenses.forEach((tx) => {
          if (tx.date.substring(0, 7) === lastMonthStr) {
            prevMonthExpense += tx.amount;
          }
        });
      }
      if (incomeResult.success && incomeResult.data) {
        incomeResult.data.incomes.forEach((inc) => {
          if (inc.transactionDate.substring(0, 7) === lastMonthStr) {
            prevMonthIncome += inc.amount;
          }
        });
      }
      if (prevMonthIncome === 0) prevMonthIncome = expectedMonthlyIncome;

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

      const prevNetSavings = prevMonthIncome - prevMonthExpense;
      const prevSavingsRate = prevMonthIncome > 0 ? Math.round((prevNetSavings / prevMonthIncome) * 100) : 0;

      const incomeTrendVal = prevMonthIncome > 0 ? Math.round(((totalIncome - prevMonthIncome) / prevMonthIncome) * 100) : 0;
      const expenseTrendVal = prevMonthExpense > 0 ? Math.round(((totalExpense - prevMonthExpense) / prevMonthExpense) * 100) : 0;
      const savingsTrendVal = prevNetSavings > 0 ? Math.round(((netSavings - prevNetSavings) / prevNetSavings) * 100) : 0;
      const rateTrendVal = savingsRate - prevSavingsRate;

      setStats({
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        incomeTrend: prevMonthIncome > 0 ? { value: Math.abs(incomeTrendVal), isPositive: incomeTrendVal >= 0 } : undefined,
        expenseTrend: prevMonthExpense > 0 ? { value: Math.abs(expenseTrendVal), isPositive: expenseTrendVal >= 0 } : undefined,
        savingsTrend: prevNetSavings > 0 ? { value: Math.abs(savingsTrendVal), isPositive: savingsTrendVal >= 0 } : undefined,
        rateTrend: prevSavingsRate > 0 ? { value: Math.abs(rateTrendVal), isPositive: rateTrendVal >= 0 } : undefined,
      });
      setRecentTransactions(recents);

      // 2. Fetch savings goals
      const goalsResult = await getSavingsGoalsAction(userId);
      if (goalsResult.success && goalsResult.data) {
        setGoals(goalsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard summary', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchChartData = useCallback(async (range: 'day' | 'week' | 'month') => {
    if (!userId) return;
    setChartLoading(true);
    try {
      const result = await getAnalyticsSummaryAction(userId, range);
      if (result.success && result.data) {
        // Map savingsTrend or overview aggregation to overview chart compatibility
        const trend = result.data.savingsTrend || [];
        const mapped = trend.map((point: any) => ({
          month: point.month,
          income: point.income,
          expense: point.expenses,
        }));
        setChartData(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch filtered chart data', error);
    } finally {
      setChartLoading(false);
    }
  }, [userId]);


  const fetchAIData = useCallback(async () => {
    if (!userId) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/review');
      if (res.ok) {
        const data = await res.json();
        setAiData(data);
      }
    } catch (err) {
      console.warn('Failed to load AI intelligence:', err);
    } finally {
      setAiLoading(false);
    }
  }, [userId]);

  const handleFeedback = async (recIndex: number, type: 'like' | 'dislike') => {
    if (!userId || !aiData?.review?.recommendations) return;
    setAiFeedback(prev => ({ ...prev, [recIndex]: type }));
    try {
      const adviceText = aiData.review.recommendations[recIndex];
      const adviceKey = `rec-${recIndex}-${adviceText.substring(0, 15).replace(/\s+/g, '-').toLowerCase()}`;
      await learnUserPreferenceAction(userId, adviceKey, type === 'like');
      
      // Still log to hindsight chat session for contextual awareness
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `System preference learning: User clicked ${type === 'like' ? 'Accept' : 'Dismiss'} on recommendation "${adviceText}"`
        })
      });
      
      // Refresh to simulate adaptive learning updates
      fetchAIData();
    } catch (err) {
      console.warn('Failed to log recommendation feedback to Hindsight:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
      fetchAIData();
    }
  }, [userId, fetchDashboardData, fetchAIData]);

  useEffect(() => {
    if (userId && isInitialized) {
      fetchChartData(timeRange);
    }
  }, [userId, timeRange, isInitialized, fetchChartData]);


  // Open modal for savings goal
  const openGoalModal = (mode: 'create' | 'edit', goal?: SavingsGoalWithPercent) => {
    setModalMode(mode);
    setValidationError('');
    
    // Default deadline to 3 months from now
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const defaultDate = threeMonthsLater.toISOString().split('T')[0];

    if (goal) {
      setSelectedGoal(goal);
      setFormName(goal.name);
      setFormTargetAmount(goal.targetAmount.toString());
      setFormCurrentAmount(goal.currentAmount.toString());
      setFormTargetDate(goal.targetDate || defaultDate);
    } else {
      setSelectedGoal(null);
      setFormName('');
      setFormTargetAmount('');
      setFormCurrentAmount('0');
      setFormTargetDate(defaultDate);
    }
    setIsModalOpen(true);
  };

  // Submit savings goal
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const target = parseFloat(formTargetAmount);
    const current = parseFloat(formCurrentAmount);

    if (!formName) {
      setValidationError('Goal name is required.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setValidationError('Please enter a valid positive target amount.');
      return;
    }
    if (isNaN(current) || current < 0) {
      setValidationError('Current saved amount cannot be negative.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const payload = {
      name: formName,
      targetAmount: target,
      currentAmount: current,
      targetDate: formTargetDate || null,
    };

    let result;
    if (modalMode === 'create') {
      result = await createSavingsGoalAction(userId, payload);
    } else if (modalMode === 'edit' && selectedGoal) {
      result = await updateSavingsGoalAction(selectedGoal.id, userId, payload);
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Goal successfully ${modalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsModalOpen(false);
      fetchDashboardData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save savings goal.');
    }
  };

  // Delete savings goal
  const handleGoalDelete = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this savings goal?')) return;
    setLoading(true);
    const result = await deleteSavingsGoalAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Goal successfully deleted.' });
      fetchDashboardData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete savings goal.' });
      setLoading(false);
    }
  };

  if (loading && !userId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Flow Screen Override */}
      {showOnboarding && userId && (
        <OnboardingFlow
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          initialStep={onboardingProgressStep}
          onComplete={async (profileData) => {
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            await refreshCurrency();
            fetchDashboardData();
            fetchAIData();
            // Clear URL search params
            router.push('/dashboard');
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setOnboardingCompleted(false);
            // Open reminder modal for this session
            const hasDismissed = sessionStorage.getItem('dismissed-onboarding-reminder') === 'true';
            if (!hasDismissed) {
              setShowSessionReminderModal(true);
            }
            router.push('/dashboard');
          }}
        />
      )}

      {/* Session reminder modal */}
      {showSessionReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12131a] border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-white text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-lg">Complete Your Profile</h4>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                Complete your profile to unlock personalized AI insights, multi-currency conversion, and better student analytics.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSessionReminderModal(false);
                  setOnboardingProgressStep(5); // Go straight to step 1
                  setShowOnboarding(true);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.2)]"
              >
                Complete Setup
              </button>
              <button
                onClick={() => {
                  setShowSessionReminderModal(false);
                  sessionStorage.setItem('dismissed-onboarding-reminder', 'true');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Dashboard Setup Reminder Card */}
      {!onboardingCompleted && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <h4 className="font-bold text-base text-yellow-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5" />
              Complete Your Setup
            </h4>
            <p className="text-xs text-muted-foreground">
              You're almost ready! Finish setting up your account to unlock:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold">
              <span>✓ AI Insights</span>
              <span>✓ Multi Currency Support</span>
              <span>✓ International Expense Tracking</span>
              <span>✓ Personalized Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Progress bar info */}
            <div className="text-right space-y-1 hidden sm:block">
              <span className="text-[10px] text-muted-foreground font-bold block">Profile Setup Progress</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '40%' }} />
                </div>
                <span className="text-[10px] font-bold text-yellow-400">40% Complete</span>
              </div>
            </div>
            <button
              onClick={() => {
                setOnboardingProgressStep(5);
                setShowOnboarding(true);
              }}
              className="px-5 py-2.5 bg-yellow-500 hover:opacity-90 active:scale-95 text-[#0b0c10] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_4px_15px_rgba(234,179,8,0.2)]"
            >
              Continue Setup
            </button>
          </div>
        </div>
      )}

      {/* Header and Welcome */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back, {userName}! Here is your student finance overview.</p>
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

      {/* Stats Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Income"
          value={<CurrencyDisplay amount={stats.totalIncome} primaryClassName="text-3xl font-bold tracking-tight" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />}
          icon={ArrowUpRight}
          trend={stats.incomeTrend}
          description={stats.incomeTrend ? `${stats.incomeTrend.isPositive ? '+' : '-'}${stats.incomeTrend.value}% vs last month` : undefined}
          gradient="from-purple-950/20 to-card/50"
        />
        <StatsCard
          title="Total Expenses"
          value={<CurrencyDisplay amount={stats.totalExpense} primaryClassName="text-3xl font-bold tracking-tight" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />}
          icon={ArrowDownRight}
          trend={stats.expenseTrend}
          description={stats.expenseTrend ? `${stats.expenseTrend.isPositive ? '+' : '-'}${stats.expenseTrend.value}% vs last month` : undefined}
          gradient="from-emerald-950/10 to-card/50"
        />
        <StatsCard
          title="Net Savings"
          value={<CurrencyDisplay amount={stats.netSavings} primaryClassName="text-3xl font-bold tracking-tight" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />}
          icon={DollarSign}
          trend={stats.savingsTrend}
          description={stats.savingsTrend ? `${stats.savingsTrend.isPositive ? '+' : '-'}${stats.savingsTrend.value}% vs last month` : "Surplus surplus surplus"}
          gradient="from-card to-card/50"
        />
        <StatsCard
          title="Savings Rate"
          value={`${stats.savingsRate}%`}
          icon={Percent}
          trend={stats.rateTrend}
          description={stats.rateTrend ? `${stats.rateTrend.isPositive ? '+' : '-'}${stats.rateTrend.value}% net shift` : "Proportion of overall savings"}
          gradient="from-card to-card/50"
        />
      </div>

      {/* AI Intelligence Dashboard Widgets - Embedded Natural Panel */}
      {(!aiLoading && aiData) ? (
        <div className="space-y-6">
          {/* Main Grid for Forecasting & Health Index */}
          {!aiData.forecast?.insufficientData && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Health Score Gauge */}
              {aiData.review?.healthScore !== null && (
                <div className="md:col-span-1 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl transition-all hover:border-emerald-500/20 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-center w-full">
                    <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      Financial Health Index
                    </h4>
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      {aiData.review.healthScore >= 80 ? 'Excellent' : aiData.review.healthScore >= 60 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                  
                  <div className="my-6 relative flex items-center justify-center">
                    <div className={`w-32 h-32 rounded-full bg-gradient-to-tr ${
                      aiData.review.healthScore >= 80 
                        ? 'from-emerald-500 to-teal-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                        : aiData.review.healthScore >= 60 
                        ? 'from-amber-500 to-orange-500 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                        : 'from-destructive to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.25)]'
                    } p-1 flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                      <div className="w-full h-full rounded-full bg-[#070913] flex flex-col items-center justify-center">
                        <span className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                          {aiData.review.healthScore}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                          / 100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1.5 w-full">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${aiData.review.healthScore}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Aggregated across budgets, savings, and expense control</p>
                  </div>
                </div>
              )}

              {/* 30-Day Cashflow Forecast Chart */}
              {aiData.forecast?.forecastGraphData?.length > 0 && (
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between shadow-2xl transition-all hover:border-purple-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <TrendingUp className="h-4.5 w-4.5 text-primary" />
                        30-Day Predictive Balance Forecast
                      </h4>
                      <div className="text-xs text-muted-foreground flex items-baseline gap-1 mt-0.5">
                        <span>Expected End Balance:</span>
                        <CurrencyDisplay amount={aiData.forecast.predictedEndOfMonthBalance} inline={true} primaryClassName="text-white font-black text-xs" secondaryClassName="text-[10px] text-muted-foreground font-semibold" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                        aiData.forecast.riskOfBudgetOverrun 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {aiData.forecast.riskOfBudgetOverrun ? `${aiData.forecast.overrunLikelihood} Overrun Risk` : 'Low Overrun Risk'}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-bold">AI Forecasted</span>
                    </div>
                  </div>

                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={aiData.forecast.forecastGraphData}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222533" vertical={false} />
                        <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `Day ${val}`} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#111320', borderColor: '#222533', borderRadius: '12px' }}
                          labelFormatter={(day) => `Day ${day} Forecast`}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} strokeDasharray="4 4" fill="url(#colorBalance)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 border-t border-slate-800/80 pt-2 flex justify-between items-center">
                    <span>🔮 {aiData.forecast.futureCashFlow}</span>
                    <span className="text-[9px] font-semibold text-primary/80">Updated via Hindsight</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1 - Premium Hero Financial Insight Card */}
          <div className="bg-gradient-to-r from-slate-900/90 via-[#0f111a] to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Financial Intelligence Agent</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-slate-800/40 border border-slate-800 px-3 py-1 rounded-full">
                AI Insight Generated • Live
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Primary Insight */}
              <div className="md:col-span-1 space-y-2 border-r border-slate-800/80 pr-6">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Primary Insight</span>
                <p className="text-sm font-bold text-slate-100 leading-relaxed">
                  {aiData.review?.incomeSummary || "Your savings rate is strong this period, keeping your financial health index high."}
                </p>
              </div>

              {/* Supporting Insights */}
              <div className="md:col-span-2 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Supporting Analytics</span>
                <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                  {aiData.review?.expenseSummary && (
                    <div className="flex gap-2 items-start text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span>{aiData.review.expenseSummary}</span>
                    </div>
                  )}
                  {aiData.review?.budgetPerformance && (
                    <div className="flex gap-2 items-start text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{aiData.review.budgetPerformance}</span>
                    </div>
                  )}
                  {aiData.review?.savingsPerformance && (
                    <div className="flex gap-2 items-start text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>{aiData.review.savingsPerformance}</span>
                    </div>
                  )}
                  {goals.length > 0 && (
                    <div className="flex gap-2 items-start text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                      <span>On track to reach your savings goal: **{goals[0].name}** ({goals[0].completionPercentage}% saved).</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grid for Recommendations & Memory System */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Section 3 - Real Memory Panel (Hindsight Visibility) */}
            <div className="md:col-span-1 bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Target className="h-4.5 w-4.5 text-primary" />
                    Hindsight Memory Engine
                  </h4>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {aiData.review?.memories?.length || 0} Learned
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
                  Long-term behaviors persistent across user activities, merchant preferences, and corrections:
                </p>

                {/* Memory Chips */}
                <div className="flex flex-wrap gap-2">
                  {(!aiData.review?.memories || aiData.review.memories.length === 0) ? (
                    <div className="text-center py-4 w-full text-[11px] text-muted-foreground italic border border-dashed border-slate-800 rounded-xl">
                      I'm still observing your habits to formulate behavior profiles.
                    </div>
                  ) : (
                    aiData.review.memories.map((mem: any, idx: number) => {
                      const label = typeof mem === 'string' 
                        ? mem 
                        : mem.key 
                          ? mem.key.replace(/_/g, ' ') 
                          : 'Habit Pattern';
                      return (
                        <div 
                          key={idx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-300 font-bold flex items-center gap-1.5 transition-colors hover:border-primary/30"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="capitalize">{label.substring(0, 24)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 mt-4 flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                <span>Real-time memory sync</span>
                <span>Active Profile</span>
              </div>
            </div>

            {/* Section 2 - Improved AI Recommendations */}
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                    AI Actions & Recommendations
                  </h4>
                  <button 
                    onClick={fetchAIData}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Refresh insights
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(!aiData.review?.recommendations || aiData.review.recommendations.length === 0) ? (
                    <div className="text-center py-6 text-xs text-muted-foreground italic">
                      No recommendations this cycle.
                    </div>
                  ) : (
                    aiData.review.recommendations.slice(0, 2).map((rec: string, i: number) => {
                      // Determine recommendation category from text
                      const recLower = rec.toLowerCase();
                      const category = recLower.includes('save') || recLower.includes('savings') ? 'Savings' 
                                     : recLower.includes('budget') || recLower.includes('limit') ? 'Budget'
                                     : recLower.includes('forecast') || recLower.includes('future') ? 'Forecast' : 'Expense';
                      const priority = recLower.includes('urgent') || recLower.includes('immediately') || recLower.includes('risk') ? 'High'
                                     : recLower.includes('consider') || recLower.includes('potential') ? 'Medium' : 'Low';
                      const impact = category === 'Savings' ? 'A$120' : category === 'Budget' ? 'A$55' : 'A$80';

                      return (
                        <div 
                          key={i} 
                          className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
                            aiFeedback[i] === 'like'
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 opacity-80'
                              : aiFeedback[i] === 'dislike'
                              ? 'bg-rose-500/5 border-rose-500/10 opacity-40 text-muted-foreground'
                              : 'bg-slate-900/50 border-slate-800/80 hover:border-primary/20'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex gap-2 items-start">
                              <span className="bg-primary/10 border border-primary/20 text-primary h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="font-semibold text-xs leading-normal text-slate-200">{rec}</span>
                            </div>

                            {/* Badge group */}
                            <div className="flex gap-1.5 shrink-0 items-center">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                category === 'Savings' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : category === 'Budget' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              }`}>
                                {category}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-800/40 pt-2.5 text-[10px]">
                            <span className="text-muted-foreground font-semibold">
                              Est. Impact: <strong className="text-emerald-400">{impact} / mo</strong>
                            </span>
                            
                            {aiFeedback[i] === undefined ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFeedback(i, 'like')}
                                  className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold transition-all"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleFeedback(i, 'dislike')}
                                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-all"
                                >
                                  Dismiss
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold text-[9px] uppercase tracking-wider">
                                {aiFeedback[i] === 'like' ? '✓ Accepted' : '✗ Dismissed'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-[9px] text-muted-foreground font-bold border-t border-slate-800/80 pt-3 flex justify-between">
                <span>Actions learnable by memory engines</span>
                <span>UniFinance Intelligence</span>
              </div>
            </div>
          </div>

          {/* Section 4 - Monthly Financial Review Grid */}
          {!aiData.review?.insufficientData && (
            <div className="bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <BarChart2 className="h-4.5 w-4.5 text-primary" />
                Monthly Financial Review Details
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs font-semibold">
                {aiData.review.largestExpenseCategory && (
                  <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between gap-1.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Largest Category</span>
                    <span className="font-black text-sm text-white">{aiData.review.largestExpenseCategory}</span>
                  </div>
                )}
                {aiData.review.topMerchants?.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between gap-1.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Top Merchant</span>
                    <span className="font-black text-sm text-white truncate">{aiData.review.topMerchants[0]}</span>
                  </div>
                )}
                <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between gap-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Best Saving Category</span>
                  <span className="font-black text-sm text-emerald-400">Education / Tuition</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between gap-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Financial Trend</span>
                  <span className="font-black text-sm text-primary flex items-center gap-1">
                    Improving <TrendingUp className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : aiLoading ? (
        <div className="bg-card/20 border border-border backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Running AI Coaching & Hindsight Models...</span>
        </div>
      ) : null}

      {/* Main Grid: Chart + Recent Transactions + Savings Goals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <OverviewChart 
            data={chartData} 
            timeRange={timeRange} 
            onTimeRangeChange={setTimeRange} 
            isLoading={chartLoading} 
          />
          
          {/* Savings Goals integration widget */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg">Savings Goals</h3>
                <p className="text-xs text-muted-foreground">Track targets for tuition, gadgets, and travels</p>
              </div>
              <button
                onClick={() => openGoalModal('create')}
                className="flex items-center gap-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Goal
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-xs text-muted-foreground">
                  No active savings goals. Create one to start tracking.
                </div>
              ) : (
                goals.map((g) => {
                  // Calculate projected contribution and status
                  const targetDateObj = g.targetDate ? new Date(g.targetDate) : null;
                  const now = new Date();
                  let monthsRemaining = 3;
                  if (targetDateObj) {
                    monthsRemaining = Math.max(1, (targetDateObj.getFullYear() - now.getFullYear()) * 12 + (targetDateObj.getMonth() - now.getMonth()));
                  }
                  const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                  const suggestedContribution = Number((remaining / monthsRemaining).toFixed(2));
                  
                  // Status determination
                  const status = g.completionPercentage >= 50 ? 'Ahead of Schedule' 
                               : g.completionPercentage >= 20 ? 'On Track' : 'Behind Schedule';

                  return (
                    <div
                      key={g.id}
                      className="rounded-xl border border-border bg-[#0b0c15]/50 p-4 space-y-3 hover:bg-secondary/20 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <Target className="h-4 w-4 text-primary" />
                              {g.name}
                            </h4>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              status === 'Ahead of Schedule' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : status === 'On Track' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {status}
                            </span>
                          </div>
                          {g.targetDate && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              Target Deadline: {g.targetDate}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openGoalModal('edit', g)}
                            className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors cursor-pointer"
                            title="Edit / Update Progress"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleGoalDelete(g.id)}
                            className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs font-semibold gap-2">
                          <div className="text-muted-foreground flex flex-col">
                            <span>Saved</span>
                            <CurrencyDisplay amount={g.currentAmount} primaryClassName="text-foreground font-bold text-xs" />
                          </div>
                          <div className="text-muted-foreground flex flex-col items-end">
                            <span>Target</span>
                            <CurrencyDisplay amount={g.targetAmount} primaryClassName="text-foreground font-bold text-xs" />
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, g.completionPercentage)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-baseline text-[10px] font-bold gap-2">
                          <div className="text-muted-foreground font-semibold flex flex-col">
                            <span>Suggested Contrib.</span>
                            <CurrencyDisplay amount={suggestedContribution} primaryClassName="text-emerald-400 font-bold text-[10px]" />
                          </div>
                          <span className="text-primary">
                            {g.completionPercentage}% Completed
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar column: Chat Assistant + Recent Transactions Panel */}
        <div className="space-y-6">
          <ChatAssistant isInline={true} />

          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Your latest financial transactions</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto mt-4 pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No recent transactions.
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  // Determine transaction source dynamically
                  const source = tx.description?.toLowerCase().includes('email') ? 'Email' 
                               : tx.description?.toLowerCase().includes('sms') ? 'SMS'
                               : tx.description?.toLowerCase().includes('receipt') || tx.description?.toLowerCase().includes('invoice') ? 'OCR' : 'Manual';
                  const hasReceipt = source === 'OCR' || tx.description?.toLowerCase().includes('receipt');

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl bg-[#0b0c15]/50 border border-slate-800/80 p-3 hover:bg-secondary/45 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-purple-500/10 text-purple-400'
                          }`}
                        >
                          {tx.type === 'INCOME' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold truncate max-w-[120px]">
                              {tx.description || tx.category}
                            </p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              source === 'OCR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : source === 'Email' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : source === 'SMS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-850 text-slate-400 border border-slate-700'
                            }`}>
                              {source}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {tx.category.replace('_', ' ')}
                            </p>
                            {hasReceipt && (
                              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/15 px-1 rounded">
                                ✓ Receipt Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span
                          className={`text-xs font-bold ${
                            tx.type === 'INCOME' ? 'text-emerald-400' : 'text-foreground'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}{format(tx.amount)}
                        </span>
                        {formatHome(tx.amount) && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {tx.type === 'INCOME' ? '+' : '-'}{formatHome(tx.amount)?.replace('≈ ', '')}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tx.date}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Modal - Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {modalMode === 'create' ? 'Create Savings Goal' : 'Edit Savings Goal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4 overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalName">
                  Goal Name
                </label>
                <input
                  id="goalName"
                  type="text"
                  placeholder="Tuition Fee Fund"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Target Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalTarget">
                  Target Amount ({currencyCode})
                </label>
                <input
                  id="goalTarget"
                  type="number"
                  step="0.01"
                  placeholder="2000.00"
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Current Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalCurrent">
                  Current Amount Saved ({currencyCode})
                </label>
                <input
                  id="goalCurrent"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={formCurrentAmount}
                  onChange={(e) => setFormCurrentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalDate">
                  Target Deadline Date
                </label>
                <input
                  id="goalDate"
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
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
                    'Save Goal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
