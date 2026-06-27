import { expenseRepository } from '@/repositories/expense.repository';
import { budgetRepository } from '@/repositories/budget.repository';
import { expenseService } from '@/services/expense.service';
import { budgetService } from '@/services/budget.service';
import { profileRepository } from '@/repositories/profile.repository';
import { incomeService } from '@/services/income.service';
import { incomeRepository } from '@/repositories/income.repository';

export interface BudgetUsage {
  category: string;
  budget: number;
  spent: number;
  usagePercent: number;
}

export interface MonthlySpending {
  month: string;
  amount: number;
}

export interface AnalyticsSummary {
  cards: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    remainingBudget: number;
  };
  expenseTrend: { date: string; amount: number }[]; // Daily/Hourly trend
  monthlySpendingTrend: MonthlySpending[]; // Aggregated spending trend
  categoryDistribution: { name: string; value: number }[]; // Top spending categories sorted desc
  budgetUsageTrend: BudgetUsage[]; // Budget usage trend
  savingsTrend: { month: string; income: number; expenses: number; savings: number }[]; // Savings trend
}

export class AnalyticsService {
  async getAnalyticsSummary(userId: string, timeRange: 'day' | 'week' | 'month' = 'month'): Promise<AnalyticsSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let startDateStr = '';
    let endDateStr = todayStr;

    if (timeRange === 'day') {
      startDateStr = todayStr;
    } else if (timeRange === 'week') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      startDateStr = past.toISOString().split('T')[0];
    } else { // 'month'
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      startDateStr = past.toISOString().split('T')[0];
    }

    // 1. Fetch filtered data from repositories (optimizing query bounds)
    const { data: rawExpenses } = await expenseRepository.findAll(userId, {
      startDate: startDateStr,
      endDate: endDateStr,
    });
    const expenses = await expenseService.getConvertedExpenses(userId, rawExpenses);

    const { data: rawIncomes } = await incomeRepository.findAll(userId, {
      startDate: startDateStr,
      endDate: endDateStr,
    });
    const incomes = rawIncomes;

    const budgets = await budgetRepository.findAll(userId);
    const expectedIncomeData = await incomeService.getExpectedMonthlyIncome(userId);
    const expectedMonthlyIncome = expectedIncomeData.expectedIncome;

    // 2. Calculate Cards Info
    // Income calculation
    let totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
    if (totalIncome === 0) {
      // Fallback to expected monthly income scaled to the time period
      if (timeRange === 'day') {
        totalIncome = expectedMonthlyIncome / 30;
      } else if (timeRange === 'week') {
        totalIncome = expectedMonthlyIncome / 4.33;
      } else {
        totalIncome = expectedMonthlyIncome;
      }
    }

    const totalExpenses = expenses.reduce((sum, exp) => exp.type === 'EXPENSE' ? sum + exp.amount : sum, 0);
    const totalSavings = totalIncome - totalExpenses;

    // Remaining Budget calculation (scaled to period)
    let totalRemainingBudget = 0;
    budgets.forEach((budget) => {
      let budgetAmount = Number(budget.amount);
      if (timeRange === 'day') {
        budgetAmount = budgetAmount / 30;
      } else if (timeRange === 'week') {
        budgetAmount = budgetAmount / 4.33;
      }

      const spent = expenses
        .filter((exp) => exp.type === 'EXPENSE' && exp.category === budget.category)
        .reduce((sum, exp) => sum + exp.amount, 0);

      const remaining = Math.max(0, budgetAmount - spent);
      totalRemainingBudget += remaining;
    });

    // 3. Category Distribution
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.type === 'EXPENSE') {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
      }
    });
    const categoryDistribution = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);

    // 4. Time range based aggregation for trends
    let expenseTrend: { date: string; amount: number }[] = [];
    let monthlySpendingTrend: MonthlySpending[] = [];
    let savingsTrend: { month: string; income: number; expenses: number; savings: number }[] = [];

    if (timeRange === 'day') {
      // Aggregate hourly (00:00 to 23:00)
      const hourlyMap: Record<string, { income: number; expense: number }> = {};
      for (let i = 0; i < 24; i++) {
        const hrStr = `${i.toString().padStart(2, '0')}:00`;
        hourlyMap[hrStr] = { income: 0, expense: 0 };
      }

      expenses.forEach((e) => {
        if (e.type === 'EXPENSE') {
          const dt = new Date(e.createdAt || e.date);
          const hr = `${dt.getHours().toString().padStart(2, '0')}:00`;
          if (hourlyMap[hr]) {
            hourlyMap[hr].expense += e.amount;
          }
        }
      });

      incomes.forEach((inc) => {
        const dt = new Date(inc.createdAt || inc.transactionTime || inc.transactionDate);
        const hr = `${dt.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hr]) {
          hourlyMap[hr].income += Number(inc.amount);
        }
      });

      expenseTrend = Object.entries(hourlyMap).map(([hr, val]) => ({
        date: hr,
        amount: Number(val.expense.toFixed(2)),
      }));

      monthlySpendingTrend = Object.entries(hourlyMap).map(([hr, val]) => ({
        month: hr,
        amount: Number(val.expense.toFixed(2)),
      }));

      savingsTrend = Object.entries(hourlyMap).map(([hr, val]) => ({
        month: hr,
        income: Number(val.income.toFixed(2)),
        expenses: Number(val.expense.toFixed(2)),
        savings: Number((val.income - val.expense).toFixed(2)),
      }));

    } else if (timeRange === 'week') {
      // Aggregate by past 7 days
      const dailyMap: Record<string, { income: number; expense: number }> = {};
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const past7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      past7Days.forEach((dateStr) => {
        dailyMap[dateStr] = { income: 0, expense: 0 };
      });

      expenses.forEach((e) => {
        if (e.type === 'EXPENSE' && dailyMap[e.date] !== undefined) {
          dailyMap[e.date].expense += e.amount;
        }
      });

      incomes.forEach((inc) => {
        if (dailyMap[inc.transactionDate] !== undefined) {
          dailyMap[inc.transactionDate].income += Number(inc.amount);
        }
      });

      expenseTrend = Object.entries(dailyMap).map(([date, val]) => {
        const d = new Date(date);
        const label = weekdays[d.getDay()];
        return {
          date: label,
          amount: Number(val.expense.toFixed(2)),
        };
      });

      monthlySpendingTrend = Object.entries(dailyMap).map(([date, val]) => {
        const d = new Date(date);
        const label = weekdays[d.getDay()];
        return {
          month: label,
          amount: Number(val.expense.toFixed(2)),
        };
      });

      savingsTrend = Object.entries(dailyMap).map(([date, val]) => {
        const d = new Date(date);
        const label = weekdays[d.getDay()];
        return {
          month: label,
          income: Number(val.income.toFixed(2)),
          expenses: Number(val.expense.toFixed(2)),
          savings: Number((val.income - val.expense).toFixed(2)),
        };
      });

    } else { // 'month'
      // Aggregate by past 30 days
      const dailyMap: Record<string, { income: number; expense: number }> = {};
      const past30Days = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });

      past30Days.forEach((dateStr) => {
        dailyMap[dateStr] = { income: 0, expense: 0 };
      });

      expenses.forEach((e) => {
        if (e.type === 'EXPENSE' && dailyMap[e.date] !== undefined) {
          dailyMap[e.date].expense += e.amount;
        }
      });

      incomes.forEach((inc) => {
        if (dailyMap[inc.transactionDate] !== undefined) {
          dailyMap[inc.transactionDate].income += Number(inc.amount);
        }
      });

      expenseTrend = Object.entries(dailyMap).map(([date, val]) => ({
        date: date.substring(5), // MM-DD
        amount: Number(val.expense.toFixed(2)),
      }));

      monthlySpendingTrend = Object.entries(dailyMap).map(([date, val]) => ({
        month: date.substring(5), // MM-DD
        amount: Number(val.expense.toFixed(2)),
      }));

      savingsTrend = Object.entries(dailyMap).map(([date, val]) => ({
        month: date.substring(5), // MM-DD
        income: Number(val.income.toFixed(2)),
        expenses: Number(val.expense.toFixed(2)),
        savings: Number((val.income - val.expense).toFixed(2)),
      }));
    }

    // 5. Budget Usage Trend
    const budgetUsageTrend = await Promise.all(
      budgets.map(async (budget) => {
        let budgetAmount = Number(budget.amount);
        if (timeRange === 'day') {
          budgetAmount = budgetAmount / 30;
        } else if (timeRange === 'week') {
          budgetAmount = budgetAmount / 4.33;
        }

        const spent = expenses
          .filter((exp) => exp.type === 'EXPENSE' && exp.category === budget.category)
          .reduce((sum, exp) => sum + exp.amount, 0);

        return {
          category: budget.category,
          budget: Number(budgetAmount.toFixed(2)),
          spent: Number(spent.toFixed(2)),
          usagePercent: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        };
      })
    );

    return {
      cards: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalSavings: Number(totalSavings.toFixed(2)),
        remainingBudget: Number(totalRemainingBudget.toFixed(2)),
      },
      expenseTrend,
      monthlySpendingTrend,
      categoryDistribution,
      budgetUsageTrend,
      savingsTrend,
    };
  }
}

export const analyticsService = new AnalyticsService();
