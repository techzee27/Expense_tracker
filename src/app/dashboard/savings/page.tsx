'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Target,
  PiggyBank,
  History,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  Edit2,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import {
  getSavingsGoalsAction,
  createSavingsGoalAction,
  updateSavingsGoalAction,
  deleteSavingsGoalAction,
} from '@/controllers/savings-goal.controller';
import {
  allocateSavingsAction,
  getGoalAllocationsAction,
  deleteAllocationAction,
} from '@/controllers/goal-allocation.controller';
import { getIncomesAction } from '@/controllers/income.controller';
import { getExpensesAction } from '@/controllers/expense.controller';
import { useCurrency } from '@/hooks/use-currency';
import { useFinancialData } from '@/components/providers/financial-data-provider';
import { CurrencyDisplay } from '@/components/dashboard/currency-display';

interface GoalAllocationItem {
  id: string;
  goalId: string;
  goalName: string;
  amount: number;
  allocationDate: string;
  source: string;
}

export default function SavingsPage() {
  const { format, formatHome } = useCurrency();
  const { refreshData } = useFinancialData();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats states
  const [actualSavings, setActualSavings] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<GoalAllocationItem[]>([]);

  // Modals and Forms
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalMode, setGoalModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [goalFormName, setGoalFormName] = useState('');
  const [goalFormTarget, setGoalFormTarget] = useState('');
  const [goalFormDate, setGoalFormDate] = useState('');
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [goalValidationError, setGoalValidationError] = useState('');

  // Allocation Modal
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocGoalId, setAllocGoalId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocDate, setAllocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [allocSubmitting, setAllocSubmitting] = useState(false);
  const [allocValidationError, setAllocValidationError] = useState('');

  // Fetch session user on mount
  useEffect(() => {
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

  const fetchSavingsData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch incomes & expenses to calculate actual savings
      const incomeResult = await getIncomesAction(userId, { limit: 1000 });
      let totalIncome = 0;
      if (incomeResult.success && incomeResult.data) {
        incomeResult.data.incomes.forEach((inc) => {
          totalIncome += inc.amount;
        });
      }

      const expenseResult = await getExpensesAction(userId, { limit: 1000 });
      let totalExpense = 0;
      if (expenseResult.success && expenseResult.data) {
        expenseResult.data.expenses.forEach((ex) => {
          if (ex.type === 'EXPENSE') {
            totalExpense += ex.amount;
          }
        });
      }

      const netSavingsVal = totalIncome - totalExpense;
      setActualSavings(netSavingsVal);

      // 2. Fetch savings goals
      const goalsResult = await getSavingsGoalsAction(userId);
      let goalsList: any[] = [];
      if (goalsResult.success && goalsResult.data) {
        goalsList = goalsResult.data;
        setGoals(goalsList);
      }

      // Compute total allocated
      const totalAllocatedVal = goalsList.reduce((sum, g) => sum + g.currentAmount, 0);
      setTotalAllocated(totalAllocatedVal);

      // 3. Fetch allocations for each goal to compile history
      const allAllocations: GoalAllocationItem[] = [];
      await Promise.all(
        goalsList.map(async (g) => {
          const res = await getGoalAllocationsAction(g.id);
          if (res.success && res.data) {
            res.data.forEach((alloc: any) => {
              allAllocations.push({
                id: alloc.id,
                goalId: alloc.goalId,
                goalName: g.name,
                amount: alloc.amount,
                allocationDate: alloc.allocationDate,
                source: alloc.source,
              });
            });
          }
        })
      );

      // Sort allocations by date descending
      allAllocations.sort((a, b) => b.allocationDate.localeCompare(a.allocationDate));
      setAllocations(allAllocations);
    } catch (err) {
      console.error('Failed to load savings and goals data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSavingsData();
    }
  }, [userId, fetchSavingsData]);

  // Goal Form handlers
  const openGoalModal = (mode: 'create' | 'edit', goal?: any) => {
    setGoalModalMode(mode);
    setGoalValidationError('');
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    const dateStr = defaultDate.toISOString().split('T')[0];

    if (goal) {
      setSelectedGoal(goal);
      setGoalFormName(goal.name);
      setGoalFormTarget(goal.targetAmount.toString());
      setGoalFormDate(goal.targetDate || dateStr);
    } else {
      setSelectedGoal(null);
      setGoalFormName('');
      setGoalFormTarget('');
      setGoalFormDate(dateStr);
    }
    setIsGoalModalOpen(true);
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const targetVal = parseFloat(goalFormTarget);
    if (!goalFormName) {
      setGoalValidationError('Goal name is required.');
      return;
    }
    if (isNaN(targetVal) || targetVal <= 0) {
      setGoalValidationError('Target amount must be a valid positive number.');
      return;
    }

    setGoalSubmitting(true);
    setGoalValidationError('');

    const payload = {
      name: goalFormName,
      targetAmount: targetVal,
      targetDate: goalFormDate || null,
      currentAmount: selectedGoal ? selectedGoal.currentAmount : 0,
    };

    let result;
    if (goalModalMode === 'create') {
      result = await createSavingsGoalAction(userId, payload);
    } else if (goalModalMode === 'edit' && selectedGoal) {
      result = await updateSavingsGoalAction(selectedGoal.id, userId, payload);
    }

    setGoalSubmitting(false);
    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Goal successfully ${goalModalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsGoalModalOpen(false);
      fetchSavingsData();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setGoalValidationError(result?.error || 'Failed to save goal.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this savings goal? All history allocations will remain unallocated.')) return;
    setLoading(true);
    const result = await deleteSavingsGoalAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Savings goal successfully deleted.' });
      fetchSavingsData();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete savings goal.' });
      setLoading(false);
    }
  };

  // Allocation Handlers
  const openAllocModal = (goalId?: string) => {
    setAllocValidationError('');
    setAllocAmount('');
    setAllocGoalId(goalId || (goals.length > 0 ? goals[0].id : ''));
    setAllocDate(new Date().toISOString().split('T')[0]);
    setIsAllocModalOpen(true);
  };

  const handleAllocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const amountVal = parseFloat(allocAmount);
    const remainingUnallocated = actualSavings - totalAllocated;

    if (!allocGoalId) {
      setAllocValidationError('Please select a savings goal.');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setAllocValidationError('Please enter a valid positive allocation amount.');
      return;
    }
    if (amountVal > remainingUnallocated) {
      setAllocValidationError(`Insufficient savings! You only have ${format(remainingUnallocated)} unallocated savings available.`);
      return;
    }

    setAllocSubmitting(true);
    setAllocValidationError('');

    const result = await allocateSavingsAction(allocGoalId, amountVal, allocDate);
    setAllocSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Allocated ${format(amountVal)} to savings goal successfully!`,
      });
      setIsAllocModalOpen(false);
      fetchSavingsData();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setAllocValidationError(result?.error || 'Failed to allocate savings.');
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete/reverse this savings allocation? The amount will return to your unallocated savings.')) return;
    setLoading(true);
    const result = await deleteAllocationAction(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Allocation successfully deleted.' });
      fetchSavingsData();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete allocation.' });
      setLoading(false);
    }
  };

  const unallocatedSavings = actualSavings - totalAllocated;

  if (loading && !userId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Savings & Allocations</h2>
          <p className="text-sm text-muted-foreground">
            Distribute your actual transaction savings across custom financial goals.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          {goals.length > 0 && unallocatedSavings > 0 && (
            <button
              onClick={() => openAllocModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all active:scale-95 shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Allocate Savings
            </button>
          )}
          <button
            onClick={() => openGoalModal('create')}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            <Plus className="h-4 w-4" />
            Create Goal
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

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Total Actual Savings */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Actual Savings</p>
            <CurrencyDisplay amount={actualSavings} primaryClassName="text-3xl font-black mt-2 text-foreground" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Calculated as (Total Income - Total Expenses)</p>
        </div>

        {/* Total Allocated to Goals */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocated to Goals</p>
            <CurrencyDisplay amount={totalAllocated} primaryClassName="text-3xl font-black mt-2 text-primary" secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Distributed to active savings targets</p>
        </div>

        {/* Unallocated Savings */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unallocated Savings</p>
            <CurrencyDisplay amount={unallocatedSavings} primaryClassName={`text-3xl font-black mt-2 ${unallocatedSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} secondaryClassName="text-xs text-muted-foreground font-semibold mt-1 block" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Available for distribution</p>
        </div>
      </div>

      {/* Main Grid: Goals list & History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals List (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-1.5">
              <Target className="h-5 w-5 text-primary" />
              Active Goals
            </h3>
            <span className="text-xs text-muted-foreground">{goals.length} Goals configured</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {goals.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-dashed border-border bg-card/10 p-12 text-center text-xs text-muted-foreground space-y-2">
                <PiggyBank className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-bold">No active savings goals</p>
                <p>Create a savings goal to start tracking progress and allocating funds.</p>
              </div>
            ) : (
              goals.map((g) => {
                const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                return (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-border bg-card/30 p-5 space-y-4 backdrop-blur-sm shadow-sm flex flex-col justify-between hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base text-foreground">{g.name}</h4>
                        {g.targetDate && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Target Date: {g.targetDate}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openGoalModal('edit', g)}
                          className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors cursor-pointer"
                          title="Edit Goal"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 transition-colors cursor-pointer"
                          title="Delete Goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <div>
                          <p className="text-muted-foreground text-[10px] uppercase">Saved</p>
                          <CurrencyDisplay amount={g.currentAmount} primaryClassName="text-foreground font-black" secondaryClassName="text-[10px] text-muted-foreground font-medium" />
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground text-[10px] uppercase">Target</p>
                          <CurrencyDisplay amount={g.targetAmount} primaryClassName="text-foreground font-black" secondaryClassName="text-[10px] text-muted-foreground font-medium" />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, g.completionPercentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <div className="flex items-baseline gap-1">
                          <span className="text-muted-foreground">Remaining:</span>
                          <CurrencyDisplay amount={remaining} inline={true} primaryClassName="text-primary font-bold" secondaryClassName="text-[9px] text-muted-foreground font-medium" />
                        </div>
                        <span className="text-primary">{g.completionPercentage}% Completed</span>
                      </div>
                    </div>

                    {remaining > 0 && unallocatedSavings > 0 && (
                      <button
                        onClick={() => openAllocModal(g.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary/25 border border-primary/30 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/30 active:scale-95 transition-all shadow-sm cursor-pointer mt-3"
                      >
                        Allocate Savings
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Allocation History */}
        <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-1.5">
              <History className="h-4.5 w-4.5 text-primary" />
              Allocation History
            </h3>
            <p className="text-xs text-muted-foreground">Audit log of goal contributions</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1 max-h-[400px]">
            {allocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-1.5 py-16 text-muted-foreground">
                <History className="h-8 w-8 opacity-30" />
                <p className="text-xs font-bold">No Allocations Yet</p>
                <p className="text-[10px] max-w-[150px]">Use the allocate button to assign savings to goals.</p>
              </div>
            ) : (
              allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/20 p-3 hover:bg-secondary/35 transition-all duration-200 border border-border/30"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{alloc.goalName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {alloc.allocationDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                      <CurrencyDisplay amount={alloc.amount} primaryClassName="text-xs font-black text-emerald-400" secondaryClassName="text-[9px] text-muted-foreground font-semibold" />
                      <p className="text-[9px] text-muted-foreground tracking-wider uppercase mt-0.5">{alloc.source.replace('_', ' ')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAllocation(alloc.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 transition-colors cursor-pointer"
                      title="Delete Allocation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Goal Modal (Create/Edit) */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {goalModalMode === 'create' ? 'Create Savings Goal' : 'Edit Savings Goal'}
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              {goalValidationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {goalValidationError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalName">
                  Goal Name
                </label>
                <input
                  id="goalName"
                  type="text"
                  placeholder="Tuition Fee, MacBook, Travel..."
                  value={goalFormName}
                  onChange={(e) => setGoalFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalTarget">
                  Target Amount
                </label>
                <input
                  id="goalTarget"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={goalFormTarget}
                  onChange={(e) => setGoalFormTarget(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="goalDate">
                  Target Date
                </label>
                <input
                  id="goalDate"
                  type="date"
                  value={goalFormDate}
                  onChange={(e) => setGoalFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {goalSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Allocate Savings
              </h3>
              <button
                onClick={() => setIsAllocModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAllocSubmit} className="space-y-4">
              {allocValidationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {allocValidationError}
                </div>
              )}

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
                <span>Available Savings:</span>
                <CurrencyDisplay amount={unallocatedSavings} inline={true} primaryClassName="font-bold text-emerald-400" secondaryClassName="text-[10px] text-emerald-400/80 font-medium" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="allocGoalSelect">
                  Select Goal
                </label>
                <select
                  id="allocGoalSelect"
                  value={allocGoalId}
                  onChange={(e) => setAllocGoalId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Saved: {format(g.currentAmount)} / Target: {format(g.targetAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="allocAmountInput">
                  Amount to Allocate
                </label>
                <input
                  id="allocAmountInput"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="allocDateInput">
                  Allocation Date
                </label>
                <input
                  id="allocDateInput"
                  type="date"
                  value={allocDate}
                  onChange={(e) => setAllocDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {allocSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
