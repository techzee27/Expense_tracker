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
  TrendingUp,
  RotateCcw,
  RefreshCw,
  Play,
  Pause,
  ChevronDown
} from 'lucide-react';
import {
  getIncomesAction,
  createIncomeAction,
  updateIncomeAction,
  deleteIncomeAction,
  getSchedulesAction,
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
  setScheduleActiveAction
} from '@/controllers/income.controller';
import { Income, INCOME_CATEGORIES, RecurringIncomeSchedule, RecurringFrequency } from '@/models/income.model';
import { useCurrency } from '@/hooks/use-currency';
import { formatCurrency } from '@/utils/currency';
import { CurrencyDisplay } from '@/components/dashboard/currency-display';
import { useFinancialData } from '@/components/providers/financial-data-provider';

export default function IncomePage() {
  const { format, formatHome, currencyCode: profileCurrency } = useCurrency();
  const { refreshData } = useFinancialData();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [schedules, setSchedules] = useState<RecurringIncomeSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'history' | 'recurring'>('history');
  const [monthlySummary, setMonthlySummary] = useState({
    totalIncomeThisMonth: 0,
    expectedIncomeThisMonth: 0,
    recurringIncomeThisMonth: 0,
    oneTimeIncomeThisMonth: 0,
    nextPayment: null as { category: string; amount: number; date: string } | null,
  });

  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [month, setMonth] = useState('');
  const [showSolarPicker, setShowSolarPicker] = useState(false);
  const [solarDate, setSolarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [solarRotation, setSolarRotation] = useState(0);
  const [isDraggingSolar, setIsDraggingSolar] = useState(false);
  const [isEditingSolarDate, setIsEditingSolarDate] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 8; // items per page

  // Message states
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<RecurringIncomeSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Pocket Money');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formPayer, setFormPayer] = useState('');
  const [formSource, setFormSource] = useState<'MANUAL' | 'EMAIL' | 'MESSAGE'>('MANUAL');
  
  // Recurring setup inside modal
  const [isRecurringSetup, setIsRecurringSetup] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [recurringStartDate, setRecurringStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const [validationError, setValidationError] = useState('');

  // Solar system date picker helpers
  const solarSystemRef = React.useRef<HTMLDivElement>(null);
  const lastAngleRef = React.useRef<number | null>(null);

  const getDisplayMonth = () => {
    if (!month) return '';
    const [year, m] = month.split('-');
    const dateObj = new Date(parseInt(year), parseInt(m) - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const syncRotationFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const base = new Date(new Date().getFullYear(), 0, 1);
    const diffDays = (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
    const rotation = (diffDays / 365.25) * 360;
    setSolarRotation(rotation);
  };

  const handleSolarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSolar(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (!solarSystemRef.current) return;
    const rect = solarSystemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    lastAngleRef.current = angle;
  };

  const handleSolarPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSolar) return;
    updateSolarRotation(e);
  };

  const handleSolarPointerUp = (e: React.PointerEvent) => {
    setIsDraggingSolar(false);
    lastAngleRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateSolarRotation = (e: React.PointerEvent) => {
    if (!solarSystemRef.current || lastAngleRef.current === null) return;
    const rect = solarSystemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let diff = angle - lastAngleRef.current;

    // Normalize boundary wrap around
    if (diff < -180) {
      diff += 360;
    } else if (diff > 180) {
      diff -= 360;
    }

    setSolarRotation((prevRotation) => {
      const newRotation = prevRotation + diff;

      // Map rotation back to date
      const base = new Date(new Date().getFullYear(), 0, 1);
      const diffDays = (newRotation / 360) * 365.25;
      const targetDate = new Date(base.getTime() + Math.round(diffDays) * 24 * 60 * 60 * 1000);
      setSolarDate(targetDate.toISOString().split('T')[0]);

      return newRotation;
    });

    lastAngleRef.current = angle;
  };

  // Sync rotation when picker is opened
  useEffect(() => {
    if (showSolarPicker) {
      syncRotationFromDate(solarDate);
    }
  }, [showSolarPicker]);

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

  // Fetch incomes function
  const fetchIncomes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getIncomesAction(userId, {
      search: search || undefined,
      category: category || undefined,
      source: sourceFilter || undefined,
      month: month || undefined,
      page,
      limit,
    });

    if (result.success && result.data) {
      setIncomes(result.data.incomes);
      setTotal(result.data.total);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to fetch incomes' });
    }

    // Fetch all incomes for the current month to compute monthly stats
    const currentMonth = new Date().toISOString().substring(0, 7);
    const summaryIncomesResult = await getIncomesAction(userId, { month: currentMonth, limit: 1000 });
    
    let totalIncomeThisMonth = 0;
    let recurringReceivedThisMonth = 0;
    let oneTimeIncomeThisMonth = 0;
    if (summaryIncomesResult.success && summaryIncomesResult.data) {
      summaryIncomesResult.data.incomes.forEach((inc) => {
        totalIncomeThisMonth += inc.amount;
        if (inc.recurring) {
          recurringReceivedThisMonth += inc.amount;
        } else {
          oneTimeIncomeThisMonth += inc.amount;
        }
      });
    }

    let upcomingIncomeThisMonth = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    let nextPayment: { category: string; amount: number; date: string } | null = null;

    // Also fetch recurring schedules
    const schedulesResult = await getSchedulesAction(userId);
    if (schedulesResult.success && schedulesResult.data) {
      setSchedules(schedulesResult.data);

      const activeSchedules = schedulesResult.data.filter((s) => s.active);

      // Calculate upcoming payments
      activeSchedules.forEach((schedule) => {
        let nextExec = schedule.nextExecutionDate;
        while (nextExec < todayStr) {
          nextExec = getNextDateString(nextExec, schedule.frequency);
        }
        let currentDateStr = nextExec;
        while (currentDateStr.startsWith(currentMonth)) {
          if (schedule.endDate && currentDateStr > schedule.endDate) {
            break;
          }
          upcomingIncomeThisMonth += schedule.amount;
          currentDateStr = getNextDateString(currentDateStr, schedule.frequency);
        }
      });

      // Find next expected payment
      const projectedSchedules = activeSchedules.map((schedule) => {
        let nextExec = schedule.nextExecutionDate;
        while (nextExec < todayStr) {
          nextExec = getNextDateString(nextExec, schedule.frequency);
        }
        return {
          category: schedule.category,
          amount: schedule.amount,
          date: nextExec,
        };
      });

      if (projectedSchedules.length > 0) {
        projectedSchedules.sort((a, b) => a.date.localeCompare(b.date));
        nextPayment = projectedSchedules[0];
      }
    }

    setMonthlySummary({
      totalIncomeThisMonth,
      expectedIncomeThisMonth: totalIncomeThisMonth + upcomingIncomeThisMonth,
      recurringIncomeThisMonth: recurringReceivedThisMonth + upcomingIncomeThisMonth,
      oneTimeIncomeThisMonth,
      nextPayment,
    });

    setLoading(false);
  }, [userId, search, category, sourceFilter, month, page, limit]);

  // Load incomes when filters/page/user changes
  useEffect(() => {
    if (userId) {
      fetchIncomes();
    }
  }, [userId, fetchIncomes]);

  // Handle open modal
  const openModal = (mode: 'create' | 'edit' | 'view', record?: any, isSchedule = false) => {
    setModalMode(mode);
    setValidationError('');
    setIsRecurringSetup(isSchedule);

    if (record) {
      if (isSchedule) {
        const sched = record as RecurringIncomeSchedule;
        setSelectedSchedule(sched);
        setSelectedIncome(null);
        setFormAmount(sched.amount.toString());
        setFormCategory(sched.category);
        setFormDescription(sched.description || '');
        setFormCurrency(sched.currency);
        setFormPayer(sched.payer || '');
        setRecurringFrequency(sched.frequency);
        setRecurringStartDate(sched.startDate);
        setRecurringEndDate(sched.endDate || '');
      } else {
        const inc = record as Income;
        setSelectedIncome(inc);
        setSelectedSchedule(null);
        setFormAmount(inc.amount.toString());
        setFormCategory(inc.category);
        setFormDescription(inc.description || '');
        setFormDate(inc.transactionDate);
        setFormCurrency(inc.currency);
        setFormPayer(inc.payer || '');
        setFormSource(inc.source);
        setIsRecurringSetup(inc.recurring);
      }
    } else {
      setSelectedIncome(null);
      setSelectedSchedule(null);
      setFormAmount('');
      setFormCategory('Pocket Money');
      setFormDescription('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormCurrency(profileCurrency);
      setFormPayer('');
      setFormSource('MANUAL');
      setIsRecurringSetup(false);
      setRecurringFrequency('MONTHLY');
      setRecurringStartDate(new Date().toISOString().split('T')[0]);
      setRecurringEndDate('');
    }
    setIsModalOpen(true);
  };

  // Submit income (create/update)
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

    setSubmitting(true);
    setValidationError('');

    let result;
    if (isRecurringSetup) {
      // Setup Recurring Schedule
      const payload = {
        amount: parsedAmount,
        currency: formCurrency,
        category: formCategory,
        payer: formPayer || null,
        frequency: recurringFrequency,
        startDate: recurringStartDate,
        endDate: recurringEndDate || null,
        description: formDescription || null,
      };

      if (modalMode === 'create') {
        result = await createScheduleAction(userId, payload);
      } else if (modalMode === 'edit' && selectedSchedule) {
        result = await updateScheduleAction(selectedSchedule.id, userId, payload);
      }
    } else {
      // Normal One-time Income
      const payload = {
        amount: parsedAmount,
        currency: formCurrency,
        category: formCategory,
        description: formDescription || null,
        payer: formPayer || null,
        source: formSource,
        recurring: false,
        transactionDate: formDate,
      };

      if (modalMode === 'create') {
        result = await createIncomeAction(userId, payload);
      } else if (modalMode === 'edit' && selectedIncome) {
        result = await updateIncomeAction(selectedIncome.id, userId, payload);
      }
    }

    setSubmitting(false);

    if (result && result.success) {
      setMessage({
        type: 'success',
        text: `Income successfully ${modalMode === 'create' ? 'created' : 'updated'}!`,
      });
      setIsModalOpen(false);
      fetchIncomes();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setValidationError(result?.error || 'Failed to save changes.');
    }
  };

  // Delete income or schedule
  const handleDelete = async (id: string, isSchedule = false) => {
    if (!userId || !confirm(`Are you sure you want to delete this ${isSchedule ? 'recurring schedule' : 'record'}?`)) return;
    setLoading(true);
    const result = isSchedule 
      ? await deleteScheduleAction(id, userId)
      : await deleteIncomeAction(id, userId);

    if (result.success) {
      setMessage({ type: 'success', text: `${isSchedule ? 'Recurring schedule' : 'Income'} successfully deleted.` });
      fetchIncomes();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete record.' });
      setLoading(false);
    }
  };

  // Toggle Schedule Active/Inactive
  const handleToggleSchedule = async (id: string, currentActive: boolean) => {
    if (!userId) return;
    setLoading(true);
    const result = await setScheduleActiveAction(id, userId, !currentActive);
    if (result.success) {
      setMessage({ type: 'success', text: `Schedule ${!currentActive ? 'activated' : 'paused'} successfully.` });
      fetchIncomes();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update schedule status.' });
      setLoading(false);
    }
  };

  // Skip next occurrence of schedule
  const handleSkipOccurrence = async (schedule: RecurringIncomeSchedule) => {
    if (!userId) return;
    const nextDate = getNextDateString(schedule.nextExecutionDate, schedule.frequency);
    setLoading(true);
    const result = await updateScheduleAction(schedule.id, userId, {
      nextExecutionDate: nextDate,
    });
    if (result.success) {
      setMessage({ type: 'success', text: 'Occurrence skipped successfully.' });
      fetchIncomes();
      refreshData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to skip occurrence.' });
      setLoading(false);
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'MESSAGE':
        return 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
      case 'EMAIL':
        return 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
      case 'MANUAL':
      default:
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'MESSAGE':
        return 'Message Record';
      case 'EMAIL':
        return 'Email Record';
      case 'MANUAL':
      default:
        return 'Manual Entry';
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getUpcomingPayments = () => {
    const list: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
    const sixtyDaysLaterStr = sixtyDaysLater.toISOString().split('T')[0];

    schedules.forEach((schedule) => {
      let nextExec = schedule.nextExecutionDate;
      while (nextExec < todayStr) {
        nextExec = getNextDateString(nextExec, schedule.frequency);
      }
      
      let currentDateStr = nextExec;
      while (currentDateStr <= sixtyDaysLaterStr) {
        if (schedule.endDate && currentDateStr > schedule.endDate) {
          break;
        }
        list.push({
          id: `${schedule.id}-${currentDateStr}`,
          schedule: schedule,
          category: schedule.category,
          amount: schedule.amount,
          currency: schedule.currency,
          date: currentDateStr,
          payer: schedule.payer,
          description: schedule.description,
        });
        currentDateStr = getNextDateString(currentDateStr, schedule.frequency);
      }
    });

    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  };

  const upcomingPayments = getUpcomingPayments();

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
        <p className="text-sm text-muted-foreground">Please sign in to view your income management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .solar-system {
          width: 240px;
          height: 240px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0;
        }
        .solar-system-rotate {
          width: 180px;
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          touch-action: none;
        }
        .solar-system-rotate:active {
          cursor: grabbing;
        }
        .solar-system-dash {
          position: absolute;
          width: 180px;
          height: 180px;
          fill: none;
          stroke: rgba(255, 255, 255, 0.25);
        }
        .earth {
          position: absolute;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .earth::before,
        .earth::after {
          content: "";
          width: 20px;
          height: 20px;
          position: absolute;
          background: rgba(200, 228, 255, 0.15);
          border-radius: 50%;
        }
        .earth::before {
          transform: scale(1.25);
        }
        .earth::after {
          transform: scale(1.5);
        }
        .earth-dash {
          position: absolute;
          width: 44px;
          height: 44px;
          fill: none;
          stroke: rgba(255, 255, 255, 0.25);
        }
        .earth-planet {
          width: 20px;
          height: 20px;
          z-index: 2;
        }
        .moon {
          width: 6.5px;
          height: 6.5px;
          background-color: #f2e6f6;
          position: absolute;
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(242, 230, 247, 0.35);
        }
        .sun {
          position: absolute;
          width: 44px;
          height: 44px;
          pointer-events: none;
        }
        .sun .blur {
          width: 44px;
          height: 44px;
          position: absolute;
          border-radius: 50%;
          background-color: #fcd385;
          opacity: 0.2;
        }
        .sun .blur-1 {
          animation: sun-blur 3s linear 0s infinite;
        }
        .sun .blur-2 {
          animation: sun-blur 3s linear -1s infinite;
        }
        .sun .blur-3 {
          animation: sun-blur 3s linear -2s infinite;
        }
        @keyframes sun-blur {
          0% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            opacity: 0.12;
          }
          100% {
            transform: scale(1.95);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Income Management</h2>
          <p className="text-sm text-muted-foreground">
            Track your income streams, manage recurring allowances, and review funding history.
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </button>
      </div>

      {/* Monthly Income Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {/* Total Income This Month */}
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Income</p>
          <CurrencyDisplay amount={monthlySummary.totalIncomeThisMonth} primaryClassName="text-2xl font-bold mt-2 text-foreground" />
          <p className="text-[10px] text-muted-foreground mt-1">Received this month</p>
        </div>

        {/* Expected Income This Month */}
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expected Income</p>
          <CurrencyDisplay amount={monthlySummary.expectedIncomeThisMonth} primaryClassName="text-2xl font-bold mt-2 text-primary" />
          <p className="text-[10px] text-muted-foreground mt-1">Received + Pending</p>
        </div>

        {/* Recurring Income This Month */}
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recurring Income</p>
          <CurrencyDisplay amount={monthlySummary.recurringIncomeThisMonth} primaryClassName="text-2xl font-bold mt-2 text-foreground" />
          <p className="text-[10px] text-muted-foreground mt-1">Received + Pending</p>
        </div>

        {/* One-Time Income This Month */}
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">One-Time Income</p>
          <CurrencyDisplay amount={monthlySummary.oneTimeIncomeThisMonth} primaryClassName="text-2xl font-bold mt-2 text-foreground" />
          <p className="text-[10px] text-muted-foreground mt-1">One-time received</p>
        </div>

        {/* Next Expected Payment */}
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300 col-span-2 md:col-span-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next Payment</p>
          {monthlySummary.nextPayment ? (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs font-bold text-foreground truncate">{monthlySummary.nextPayment.category}</p>
              <CurrencyDisplay amount={monthlySummary.nextPayment.amount} primaryClassName="text-sm font-bold text-primary" />
              <p className="text-[10px] text-muted-foreground font-semibold">Due: {formatDueCategory(monthlySummary.nextPayment.date)}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">No pending payment</p>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Income History
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'recurring'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recurring Streams
        </button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
            }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {activeTab === 'history' && (
        <>
          {/* Filters Bar */}
          <div className="relative z-20 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 rounded-2xl border border-border/80 bg-card/45 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-primary/20">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search details..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-foreground placeholder-muted-foreground/70"
              />
            </div>

            {/* Category Filter */}
            <div className="relative group">
              <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 appearance-none cursor-pointer text-foreground/90 font-medium"
              >
                <option value="">All Categories</option>
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors duration-200" />
            </div>

            {/* Source Filter */}
            <div className="relative group">
              <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 appearance-none cursor-pointer text-foreground/90 font-medium"
              >
                <option value="">All Sources</option>
                <option value="MANUAL">Manual Entry</option>
                <option value="MESSAGE">Message Record</option>
                <option value="EMAIL">Email Record</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors duration-200" />
            </div>

            {/* Monthly Filter */}
            <div className={`relative group ${showSolarPicker ? 'z-50' : 'z-10'}`}>
              <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary pointer-events-none transition-colors duration-200" />
              <input
                type="text"
                readOnly
                placeholder="Filter by Month"
                value={getDisplayMonth()}
                onClick={() => setShowSolarPicker(!showSolarPicker)}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-border/60 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-200 cursor-pointer text-foreground/90 font-medium hover:border-primary/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              />

              {showSolarPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 bg-[#1e2330]/60 backdrop-blur-2xl border border-white/15 rounded-[24px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] w-[320px] flex flex-col items-center select-none text-white">
                  <div className="text-center text-[15px] font-semibold text-white pb-3 border-b border-white/10 w-full mb-4 flex justify-center items-center min-h-[36px]">
                    {isEditingSolarDate ? (
                      <input
                        type="date"
                        value={solarDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setSolarDate(val);
                            syncRotationFromDate(val);
                          }
                        }}
                        onBlur={() => setIsEditingSolarDate(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingSolarDate(false);
                          }
                        }}
                        autoFocus
                        className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-primary w-full max-w-[200px]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingSolarDate(true)}
                        className="cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
                      >
                        <span>
                          {(() => {
                            const d = new Date(solarDate);
                            return isNaN(d.getTime()) ? 'Select Date' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          })()}
                        </span>
                        <Edit2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                      </button>
                    )}
                  </div>

                  <div
                    ref={solarSystemRef}
                    onPointerDown={handleSolarPointerDown}
                    onPointerMove={handleSolarPointerMove}
                    onPointerUp={handleSolarPointerUp}
                    className="solar-system"
                  >
                    <div className="solar-system-rotate" style={{ transform: `rotate(${solarRotation}deg)` }}>
                      <svg className="solar-system-dash" viewBox="0 0 162 162">
                        <circle cx="81" cy="81" r="80" strokeDasharray="3 3" />
                      </svg>
                      <div className="earth" style={{ transform: 'translate(90px, 0)' }}>
                        <svg className="earth-dash" viewBox="0 0 43 43" style={{ transform: `rotate(${-solarRotation * 3}deg)` }}>
                          <circle cx="21.5" cy="21.5" r="20.5" strokeDasharray="3 3" />
                        </svg>
                        <svg className="earth-planet" viewBox="0 0 19 19">
                          <circle cx="9.5" cy="9.5" r="9.5" fill="#C8E4FF" />
                        </svg>
                        <div className="moon" style={{ transform: `rotate(${solarRotation * 4}deg) translate(21.5px, 0)` }}></div>
                      </div>
                    </div>
                    <div className="sun">
                      <div className="blur blur-1"></div>
                      <div className="blur blur-2"></div>
                      <div className="blur blur-3"></div>
                      <svg viewBox="0 0 40 40" className="w-10 h-10 display-block relative z-10">
                        <circle cx="20" cy="20" r="20" fill="#FCD385" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full mt-6">
                    <button
                      type="button"
                      onClick={() => setShowSolarPicker(false)}
                      className="flex-1 py-2.5 bg-white/5 border border-white/25 hover:bg-white/10 text-white rounded-full font-semibold text-xs transition-all cursor-pointer text-center active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMonth(solarDate.substring(0, 7));
                        setPage(1);
                        setShowSolarPicker(false);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#FCA274] to-[#FD8A6B] hover:opacity-90 text-white rounded-full font-semibold text-xs transition-all cursor-pointer text-center shadow-[0_4px_15px_rgba(253,138,107,0.3)] active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setSourceFilter('');
                setMonth('');
                setPage(1);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-secondary/15 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-secondary/30 hover:border-primary/30 transition-all active:scale-95 duration-200 shadow-sm cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>

          {/* Income Table */}
          <div className="relative z-10 rounded-2xl border border-border bg-card/30 backdrop-blur-md overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading transactions...</p>
              </div>
            ) : incomes.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="font-bold text-lg">No records found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No income transactions match your filters. Try resetting them or add a new income record.
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
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Recurring</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {incomes.map((income) => (
                      <tr
                        key={income.id}
                        className="hover:bg-secondary/10 transition-colors duration-150 text-sm"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-muted-foreground">
                          {income.transactionDate}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground truncate max-w-[200px]">
                          <div className="flex flex-col">
                            <span>{income.description || '-'}</span>
                            {income.payer && (
                              <span className="text-[11px] text-muted-foreground font-normal">
                                From: {income.payer}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded-lg bg-secondary/30 px-2.5 py-1 text-xs font-medium text-foreground/80">
                            {income.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSourceBadgeClass(income.source)}`}>
                            {getSourceLabel(income.source)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                            income.recurring 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/10'
                          }`}>
                            {income.recurring ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-emerald-400 font-bold">+{format(income.amount)}</span>
                            {formatHome(income.amount) && (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                +{formatHome(income.amount)?.replace('≈ ', '')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openModal('view', income)}
                              className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', income)}
                              className="rounded-lg p-1.5 hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(income.id, false)}
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
            {!loading && incomes.length > 0 && (
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
        </>
      )}

      {activeTab === 'recurring' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Recurring Streams List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-lg font-bold">Active Recurring Streams</h3>
              <button
                onClick={() => openModal('create', null, true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded-xl text-xs font-bold text-purple-400 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New Stream
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {schedules.length === 0 ? (
                <div className="col-span-2 text-center py-16 border border-dashed border-border rounded-2xl bg-card/25 text-muted-foreground space-y-2">
                  <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground opacity-60 animate-pulse" />
                  <h4 className="font-bold">No recurring income streams</h4>
                  <p className="text-xs">Create automated allowances, parental monthly stipends, or regular freelance retainers.</p>
                </div>
              ) : (
                schedules.map((schedule) => (
                  <div 
                    key={schedule.id}
                    className={`rounded-2xl border bg-card/30 p-5 space-y-4 backdrop-blur-sm transition-all relative ${
                      schedule.active ? 'border-primary/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)]' : 'border-border opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="rounded-lg bg-secondary/40 px-2.5 py-1 text-xs font-bold text-foreground/80">
                          {schedule.category}
                        </span>
                        <h4 className="font-bold text-base pt-1">
                          {schedule.description || schedule.category}
                        </h4>
                        {schedule.payer && (
                          <p className="text-xs text-muted-foreground">From: {schedule.payer}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-lg font-extrabold text-emerald-400">
                          +{format(schedule.amount)}
                        </span>
                        {formatHome(schedule.amount) && (
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            +{formatHome(schedule.amount)?.replace('≈ ', '')}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{schedule.frequency}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50 text-xs">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-bold">{schedule.startDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Execution</p>
                        <p className="font-bold text-primary">{schedule.nextExecutionDate}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-border/40">
                      <button
                        onClick={() => handleToggleSchedule(schedule.id, schedule.active)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          schedule.active 
                            ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {schedule.active ? (
                          <>
                            <Pause className="h-3 w-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Activate
                          </>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal('edit', schedule, true)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-all cursor-pointer"
                          title="Edit Stream"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id, true)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                          title="Delete Stream"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Income Widget */}
          <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md flex flex-col h-fit space-y-4">
            <div>
              <h3 className="font-bold text-lg">Upcoming Income</h3>
              <p className="text-xs text-muted-foreground">Projected schedule for the next 60 days</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {upcomingPayments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">No upcoming income schedule.</p>
              ) : (
                upcomingPayments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col rounded-xl bg-secondary/15 p-3.5 space-y-2 hover:bg-secondary/25 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {formatDueCategory(item.date)}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm font-bold text-emerald-400">
                          +{format(item.amount)}
                        </span>
                        {formatHome(item.amount) && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            +{formatHome(item.amount)?.replace('≈ ', '')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-border/30">
                      <span className="font-medium text-foreground truncate max-w-[130px]" title={item.description || item.category}>
                        {item.description || item.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal('view', item.schedule, true)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary px-1.5 py-0.5 rounded transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openModal('edit', item.schedule, true)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-secondary px-1.5 py-0.5 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSkipOccurrence(item.schedule)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-amber-400 hover:bg-secondary px-1.5 py-0.5 rounded transition-colors"
                          title="Skip next execution"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleToggleSchedule(item.schedule.id, item.schedule.active)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-destructive hover:bg-secondary px-1.5 py-0.5 rounded transition-colors"
                        >
                          {item.schedule.active ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Create/Edit/View Income */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-lg">
                {modalMode === 'create' && (isRecurringSetup ? 'Add Recurring Stream' : 'Add Income Record')}
                {modalMode === 'edit' && (isRecurringSetup ? 'Edit Recurring Stream' : 'Edit Income Record')}
                {modalMode === 'view' && 'Income Details'}
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

              {/* Recurring Switch (Only available during creation/editing of manual incomes) */}
              {modalMode !== 'view' && !selectedIncome && !selectedSchedule && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-secondary/10">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground">Recurring Income Stream</label>
                    <p className="text-[10px] text-muted-foreground">Automatically log this income on a scheduled basis.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurringSetup}
                    onChange={(e) => setIsRecurringSetup(e.target.checked)}
                    className="h-4 w-4 rounded border border-border bg-secondary/30 accent-primary shrink-0 cursor-pointer"
                  />
                </div>
              )}

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
                    placeholder="250.00"
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

              {/* Converted home currency display for view mode */}
              {modalMode === 'view' && selectedIncome && (
                <div className="p-3 bg-secondary/15 rounded-xl border border-border/30 text-xs flex justify-between items-center mt-2">
                  <span className="text-muted-foreground font-semibold">Home Currency Equivalent:</span>
                  <CurrencyDisplay amount={selectedIncome.amount} primaryClassName="font-bold text-foreground text-sm" />
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
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalPayer">
                  Payer / Payer Name
                </label>
                <input
                  id="modalPayer"
                  type="text"
                  placeholder="Enter source name (e.g. University, Parents, Client)"
                  value={formPayer}
                  onChange={(e) => setFormPayer(e.target.value)}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
              </div>

              {/* One-time Specific Fields */}
              {!isRecurringSetup && (
                <>
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDate">
                      Date Received
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

                </>
              )}

              {/* Recurring Specific Fields */}
              {isRecurringSetup && (
                <div className="p-4 rounded-xl border border-border/80 bg-secondary/5 space-y-3">
                  <h4 className="text-xs font-bold text-primary">Schedule Configuration</h4>
                  
                  {/* Frequency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="recurringFreq">
                      Frequency
                    </label>
                    <select
                      id="recurringFreq"
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-xs"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="recurringStart">
                      Start Date
                    </label>
                    <input
                      id="recurringStart"
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-xs"
                      required
                    />
                  </div>

                  {/* End Date (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="recurringEnd">
                      End Date (Optional)
                    </label>
                    <input
                      id="recurringEnd"
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modalDescription">
                  Description
                </label>
                <textarea
                  id="modalDescription"
                  placeholder="E.g., Monthly support from parents, scholarship stipend"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={modalMode === 'view'}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                />
              </div>

              {/* Additional Details for VIEW Mode */}
              {modalMode === 'view' && selectedIncome && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/10 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Source:</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${getSourceBadgeClass(selectedIncome.source)}`}>
                      {getSourceLabel(selectedIncome.source)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Is Recurring:</span>
                    <span className="font-bold">{selectedIncome.recurring ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedIncome.smsId && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-semibold">SMS Sender:</span>
                        <span className="font-mono font-semibold">{selectedIncome.senderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-semibold">Payment Method:</span>
                        <span className="font-semibold">{selectedIncome.paymentMethod}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

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
                      'Save Income'
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

function getNextDateString(currentDateStr: string, frequency: string): string {
  const current = new Date(currentDateStr);
  if (isNaN(current.getTime())) return currentDateStr;
  switch (frequency) {
    case 'DAILY':
      current.setDate(current.getDate() + 1);
      break;
    case 'WEEKLY':
      current.setDate(current.getDate() + 7);
      break;
    case 'MONTHLY':
      current.setMonth(current.getMonth() + 1);
      break;
    case 'QUARTERLY':
      current.setMonth(current.getMonth() + 3);
      break;
    case 'YEARLY':
      current.setFullYear(current.getFullYear() + 1);
      break;
  }
  return current.toISOString().split('T')[0];
}

function formatDueCategory(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
