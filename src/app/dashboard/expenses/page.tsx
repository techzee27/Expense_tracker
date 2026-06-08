'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  getExpensesAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '@/controllers/expense.controller';
import { Expense, EXPENSE_CATEGORIES } from '@/models/expense.model';
import { useCurrency } from '@/hooks/use-currency';
import { formatCurrency } from '@/utils/currency';

export default function ExpensesPage() {
  const { format, currencyCode: profileCurrency } = useCurrency();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  
  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | ''>('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const limit = 8; // items per page

  // Message states
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formCategory, setFormCategory] = useState('Food');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [validationError, setValidationError] = useState('');

  // Fetch session user
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

  // Update form currency when profile currency loads/changes
  useEffect(() => {
    if (profileCurrency) {
      setFormCurrency(profileCurrency);
    }
  }, [profileCurrency]);

  // Fetch expenses function
  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getExpensesAction(userId, {
      search: search || undefined,
      category: category || undefined,
      type: type || undefined,
      month: month || undefined,
      page,
      limit,
    });

    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setTotal(result.data.total);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to fetch expenses' });
    }
    setLoading(false);
  }, [userId, search, category, type, month, page, limit]);

  // Load expenses when filters/page/user changes
  useEffect(() => {
    if (userId) {
      fetchExpenses();
    }
  }, [userId, fetchExpenses]);

  // Handle open modal
  const openModal = (mode: 'create' | 'edit' | 'view', expense?: Expense) => {
    setModalMode(mode);
    setValidationError('');
    if (expense) {
      setSelectedExpense(expense);
      // Populate with the original amount and currency
      setFormAmount(expense.originalAmount !== undefined ? expense.originalAmount.toString() : expense.amount.toString());
      setFormType(expense.type);
      setFormCategory(expense.category);
      setFormDescription(expense.description || '');
      setFormDate(expense.date);
      setFormCurrency(expense.originalCurrency || profileCurrency);
    } else {
      setSelectedExpense(null);
      setFormAmount('');
      setFormType('EXPENSE');
      setFormCategory('Food');
      setFormDescription('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormCurrency(profileCurrency);
    }
    setIsModalOpen(true);
  };

  // Submit expense (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validate inputs
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive amount.');
      return;
    }
    if (!formCategory) {
      setValidationError('Category is required.');
      return;
    }
    if (!formDate) {
      setValidationError('Date is required.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const payload = {
      amount: parsedAmount,
      type: formType,
      category: formCategory,
      description: formDescription || null,
      date: formDate,
      originalCurrency: formCurrency,
    };

    let result;
    if (modalMode === 'create') {
      result = await createExpenseAction(userId, payload);
    } else if (modalMode === 'edit' && selectedExpense) {
      result = await updateExpenseAction(selectedExpense.id, userId, payload);
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Expense successfully ${modalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsModalOpen(false);
      fetchExpenses();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save changes.');
    }
  };

  // Delete expense
  const handleDelete = async (id: string) => {
    if (!userId || !confirm('Are you sure you want to delete this record?')) return;
    setLoading(true);
    const result = await deleteExpenseAction(id, userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Expense successfully deleted.' });
      fetchExpenses();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete expense.' });
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

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
        <p className="text-sm text-muted-foreground">Please sign in to view your expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Expense Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily transactions, view academic expenses, and balance your budget.
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Expense
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

      {/* Filters Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 rounded-2xl border border-border bg-card/30 p-4 backdrop-blur-md">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search details..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as 'INCOME' | 'EXPENSE' | '');
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none"
          >
            <option value="">All Types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Monthly Filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none"
          />
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => {
            setSearch('');
            setCategory('');
            setType('');
            setMonth('');
            setPage(1);
          }}
          className="rounded-xl border border-border bg-secondary/10 px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* Expenses Table/Grid */}
      <div className="rounded-2xl border border-border bg-card/30 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-lg">No records found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No transactions match your current filters. Try resetting them or add a new expense.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-secondary/10 transition-colors duration-150 text-sm"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-muted-foreground">
                      {expense.date}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground truncate max-w-[200px]">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-lg bg-secondary/30 px-2.5 py-1 text-xs font-medium text-foreground/80">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          expense.type === 'INCOME' ? 'text-emerald-400' : 'text-purple-400'
                        }`}
                      >
                        {expense.type === 'INCOME' ? (
                          <>
                            <TrendingUp className="h-3.5 w-3.5" />
                            Income
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3.5 w-3.5" />
                            Expense
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`font-bold ${expense.type === 'INCOME' ? 'text-emerald-400' : 'text-foreground'}`}>
                        {expense.type === 'INCOME' ? '+' : '-'}{format(expense.amount)}
                      </div>
                      {expense.originalCurrency && expense.originalCurrency !== profileCurrency && (
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          ({expense.type === 'INCOME' ? '+' : '-'}{formatCurrency(expense.originalAmount, expense.originalCurrency)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal('view', expense)}
                          className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', expense)}
                          className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && expenses.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-secondary/5">
            <p className="text-xs text-muted-foreground">
              Showing page <span className="font-semibold">{page}</span> of{' '}
              <span className="font-semibold">{totalPages}</span> ({total} total items)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Create/Edit/View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {modalMode === 'create' && 'Add Transaction'}
                {modalMode === 'edit' && 'Edit Transaction'}
                {modalMode === 'view' && 'Transaction Details'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}

              {/* Type Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={modalMode === 'view'}
                    onClick={() => setFormType('EXPENSE')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                      formType === 'EXPENSE'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                        : 'bg-secondary/10 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    disabled={modalMode === 'view'}
                    onClick={() => setFormType('INCOME')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                      formType === 'INCOME'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-secondary/10 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalAmount">
                    Amount
                  </label>
                  <input
                    id="modalAmount"
                    type="number"
                    step="0.01"
                    placeholder="25.50"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    required
                  />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalCurrency">
                    Currency
                  </label>
                  <select
                    id="modalCurrency"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    required
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'].map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalCategory">
                  Category
                </label>
                <select
                  id="modalCategory"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={modalMode === 'view'}
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

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDate">
                  Date
                </label>
                <input
                  id="modalDate"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDescription">
                  Description
                </label>
                <textarea
                  id="modalDescription"
                  placeholder="E.g., Campus cafeteria dinner with friends"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={modalMode === 'view'}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-secondary/10 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-all cursor-pointer"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
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
                      'Save Transaction'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
