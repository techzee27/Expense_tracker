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
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { getExpensesAction } from '@/controllers/expense.controller';
import { getProfileAction } from '@/controllers/profile.controller';
import {
  getSavingsGoalsAction,
  createSavingsGoalAction,
  updateSavingsGoalAction,
  deleteSavingsGoalAction,
} from '@/controllers/savings-goal.controller';
import { SavingsGoalWithPercent } from '@/services/savings-goal.service';
import { Expense } from '@/models/expense.model';

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Student');
  const [loading, setLoading] = useState(true);

  // Financial data
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Expense[]>([]);
  const [chartData, setChartData] = useState<{ month: string; income: number; expense: number }[]>([]);

  // Savings goals
  const [goals, setGoals] = useState<SavingsGoalWithPercent[]>([]);

  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Goal modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalWithPercent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Goal Form states
  const [formName, setFormName] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('0');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [validationError, setValidationError] = useState('');

  // Fetch session user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || 'Student');
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch all dashboard data dynamically
  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1. Fetch profile for monthlyIncome
      let totalIncome = 0;
      const profileResult = await getProfileAction(userId);
      if (profileResult.success && profileResult.data) {
        totalIncome = profileResult.data.monthlyIncome || 0;
      }

      // 2. Fetch expenses
      const expenseResult = await getExpensesAction(userId, { limit: 1000 }); // fetch up to 1000 for stats calculation
      let totalExpense = 0;
      let recents: Expense[] = [];

      if (expenseResult.success && expenseResult.data) {
        const list = expenseResult.data.expenses;
        recents = list.slice(0, 5);
        list.forEach((tx) => {
          if (tx.type === 'EXPENSE') {
            totalExpense += tx.amount;
          }
        });
      }

      // 3. Calculate monthly trend data (last 6 months) dynamically based only on months with records
      const monthsWithData = new Set<string>();
      if (expenseResult.success && expenseResult.data) {
        expenseResult.data.expenses.forEach((e) => {
          monthsWithData.add(e.date.substring(0, 7)); // YYYY-MM
        });
      }

      const sortedMonths = Array.from(monthsWithData).sort();
      const monthlyMap: Record<string, { income: number; expense: number }> = {};
      sortedMonths.forEach((m) => {
        // Set baseline monthly income from profile settings
        monthlyMap[m] = { income: totalIncome, expense: 0 };
      });

      if (expenseResult.success && expenseResult.data) {
        const list = expenseResult.data.expenses;
        list.forEach((tx) => {
          const m = tx.date.substring(0, 7); // YYYY-MM
          if (monthlyMap[m]) {
            if (tx.type === 'EXPENSE') {
              monthlyMap[m].expense += tx.amount;
            }
          }
        });
      }

      const calculatedChartData = Object.entries(monthlyMap).map(([month, data]) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIndex = parseInt(month.split('-')[1]) - 1;
        return {
          month: monthNames[mIndex],
          income: Number(data.income.toFixed(2)),
          expense: Number(data.expense.toFixed(2)),
        };
      });
      setChartData(calculatedChartData);

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

      setStats({
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
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

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId, fetchDashboardData]);

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
          value={`$${stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          trend={{ value: 0, isPositive: true }}
          gradient="from-purple-950/20 to-card/50"
        />
        <StatsCard
          title="Total Expenses"
          value={`$${stats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ArrowDownRight}
          trend={{ value: 0, isPositive: false }}
          gradient="from-emerald-950/10 to-card/50"
        />
        <StatsCard
          title="Net Savings"
          value={`$${stats.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="Net surplus from transactions"
          gradient="from-card to-card/50"
        />
        <StatsCard
          title="Savings Rate"
          value={`${stats.savingsRate}%`}
          icon={Percent}
          description="Percentage of income saved"
          trend={{ value: 0, isPositive: true }}
          gradient="from-card to-card/50"
        />
      </div>

      {/* Main Grid: Chart + Recent Transactions + Savings Goals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <OverviewChart data={chartData} />
          
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

            <div className="grid gap-4 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-xs text-muted-foreground">
                  No active savings goals. Create one to start tracking.
                </div>
              ) : (
                goals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-border bg-secondary/10 p-4 space-y-3 hover:bg-secondary/20 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-primary" />
                          {g.name}
                        </h4>
                        {g.targetDate && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Target: {g.targetDate}
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
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">
                          Saved: <strong className="text-foreground">${g.currentAmount}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Target: <strong className="text-foreground">${g.targetAmount}</strong>
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, g.completionPercentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground font-semibold">
                          Remaining: <span className="text-primary font-bold">${Math.max(0, g.targetAmount - g.currentAmount)}</span>
                        </span>
                        <span className="text-primary">
                          {g.completionPercentage}% Completed
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Panel */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col h-full justify-between min-h-[400px]">
          <div>
            <h3 className="font-bold text-lg">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Your latest financial transactions</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto mt-4 pr-1 max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-20 text-xs text-muted-foreground">
                No recent transactions.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/20 p-3.5 hover:bg-secondary/40 transition-all duration-200"
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
                      <p className="text-sm font-semibold truncate max-w-[120px]">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {tx.category.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === 'INCOME' ? 'text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
              ))
            )}
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
                  Target Amount ($)
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
                  Current Amount Saved ($)
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
