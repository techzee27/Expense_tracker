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
import { BudgetWithUsage } from '@/services/budget.service';
import { EXPENSE_CATEGORIES } from '@/models/expense.model';
import { useCurrency } from '@/hooks/use-currency';

export default function BudgetsPage() {
  const { format, currencyCode } = useCurrency();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
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
      } else {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch budgets function
  const fetchBudgets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getBudgetsWithUsageAction(userId);

    if (result.success && result.data) {
      setBudgets(result.data);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to fetch budgets' });
    }
    setLoading(false);
  }, [userId]);

  // Load budgets
  useEffect(() => {
    if (userId) {
      fetchBudgets();
    }
  }, [userId, fetchBudgets]);

  // Handle open modal
  const openModal = (mode: 'create' | 'edit', budget?: BudgetWithUsage) => {
    setModalMode(mode);
    setValidationError('');
    
    // Set default dates to current month range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    if (budget) {
      setSelectedBudget(budget);
      setFormCategory(budget.category);
      setFormAmount(budget.amount.toString());
      setFormStartDate(budget.startDate);
      setFormEndDate(budget.endDate);
    } else {
      setSelectedBudget(null);
      setFormCategory('Food');
      setFormAmount('');
      setFormStartDate(firstDay);
      setFormEndDate(lastDay);
    }
    setIsModalOpen(true);
  };

  // Submit budget (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validate inputs
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
      result = await createBudgetAction(userId, payload);
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
      fetchBudgets();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save changes. Make sure a budget doesn\'t already exist for this category and date range.');
    }
  };

  // Delete budget
  const handleDelete = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this budget?')) return;
    setLoading(true);
    const result = await deleteBudgetAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Budget successfully deleted.' });
      fetchBudgets();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete budget.' });
      setLoading(false);
    }
  };

  // Calculations
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.usedAmount, 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remainingAmount, 0);
  const overallUtilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Recharts data format
  const chartData = budgets.map((b) => ({
    name: b.category,
    Budget: b.amount,
    Spent: b.usedAmount,
  }));

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
        <p className="text-sm text-muted-foreground">Please sign in to view and manage your budgets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Budget Planner</h2>
          <p className="text-sm text-muted-foreground">
            Set monthly limits, monitor category utilization rates, and safeguard your savings.
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Budget
        </button>
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Budgeted</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <PiggyBank className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-black">{format(totalBudgeted)}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</p>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-black">{format(totalSpent)}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining Balance</p>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Check className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-black">{format(totalRemaining)}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Utilization</p>
            <div className="rounded-lg bg-secondary/30 p-2 text-foreground/70">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-black">{overallUtilization}%</h4>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart + Progress List */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recharts Budget vs actual Bar Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between min-h-[350px]">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Budget vs actual Spent</h3>
            <p className="text-xs text-muted-foreground">Detailed visual performance of spending across target limits</p>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            {mounted && chartData.length > 0 ? (
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
                No budget data to chart. Create a monthly limit to display metrics.
              </div>
            )}
          </div>
        </div>

        {/* Budget list cards (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col justify-between max-h-[450px]">
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Active Budgets</h3>
              <p className="text-xs text-muted-foreground">Utilization tracking by category limits</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No active budgets. Click 'Create Budget' to get started.
              </div>
            ) : (
              budgets.map((b) => {
                // Color codes based on usage
                let progressColor = 'bg-emerald-500';
                if (b.utilizationPercentage >= 90) {
                  progressColor = 'bg-rose-500';
                } else if (b.utilizationPercentage >= 75) {
                  progressColor = 'bg-amber-500';
                }

                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-border bg-secondary/10 p-4 space-y-3 hover:bg-secondary/20 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{b.category}</h4>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {b.startDate} to {b.endDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal('edit', b)}
                          className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
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
                          Spent: <strong className="text-foreground">{format(b.usedAmount)}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Limit: <strong className="text-foreground">{format(b.amount)}</strong>
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(100, b.utilizationPercentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">
                          Remaining: <strong>{format(b.remainingAmount)}</strong>
                        </span>
                        <span className="font-bold uppercase tracking-wider text-xs">
                          {b.utilizationPercentage}%
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
