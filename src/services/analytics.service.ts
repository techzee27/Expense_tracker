import { expenseRepository } from '@/repositories/expense.repository';
import { budgetRepository } from '@/repositories/budget.repository';
import { expenseService } from '@/services/expense.service';
import { budgetService } from '@/services/budget.service';
import { profileRepository } from '@/repositories/profile.repository';

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
  expenseTrend: { date: string; amount: number }[]; // Daily trend (last 14 days)
  monthlySpendingTrend: MonthlySpending[]; // Monthly spending trend (real database only)
  categoryDistribution: { name: string; value: number }[]; // Top spending categories sorted desc
  budgetUsageTrend: BudgetUsage[]; // Budget usage trend
  savingsTrend: { month: string; income: number; expenses: number; savings: number }[]; // Savings trend (real database only)
}

export class AnalyticsService {
  async getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
    // 1. Fetch data from repositories
    const { data: rawExpenses } = await expenseRepository.findAll(userId);
    const expenses = await expenseService.getConvertedExpenses(userId, rawExpenses);
    const budgets = await budgetRepository.findAll(userId);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 2. Calculate Cards Info - totalIncome is considered from Estimated Monthly Income
    const profile = await profileRepository.findById(userId);
    const totalIncome = profile?.monthlyIncome || 0;

    let totalExpenses = 0;
    expenses.forEach((e) => {
      if (e.type === 'EXPENSE') {
        totalExpenses += e.amount;
      }
    });

    const totalSavings = totalIncome - totalExpenses;

    // Remaining Budget calculation:
    // Only look at budgets that are currently active (startDate <= now <= endDate)
    let totalRemainingBudget = 0;
    
    budgets.forEach((budget) => {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // If budget is active
      if (now >= start && now <= end) {
        // Find matching expenses
        const spent = expenses
          .filter((exp) => {
            if (exp.type !== 'EXPENSE') return false;
            if (exp.category !== budget.category) return false;
            const d = new Date(exp.date);
            d.setHours(0, 0, 0, 0);
            return d >= start && d <= end;
          })
          .reduce((sum, exp) => sum + exp.amount, 0);
        
        const remaining = Math.max(0, budget.amount - spent);
        totalRemainingBudget += remaining;
      }
    });

    // 3. Category Distribution (Pie chart/Bar chart data) - Sorted Descending
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
      .sort((a, b) => b.value - a.value); // Top categories first

    // 4. Expense Trend (Daily for the last 14 days)
    const dailyMap: Record<string, number> = {};
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last14Days.forEach((dateStr) => {
      dailyMap[dateStr] = 0;
    });

    expenses.forEach((e) => {
      if (e.type === 'EXPENSE' && dailyMap[e.date] !== undefined) {
        dailyMap[e.date] += e.amount;
      }
    });

    const expenseTrend = Object.entries(dailyMap).map(([date, amount]) => ({
      date: date.substring(5), // Keep only MM-DD
      amount: Number(amount.toFixed(2)),
    }));

    // 5. Savings Trend & Monthly Spending Trend Setup
    // Dynamically query unique months present inside actual user transactions
    const monthsWithData = new Set<string>();
    expenses.forEach((e) => {
      monthsWithData.add(e.date.substring(0, 7)); // YYYY-MM
    });

    const sortedMonths = Array.from(monthsWithData).sort();

    const monthlyMap: Record<string, { income: number; expenses: number; hasData: boolean }> = {};
    sortedMonths.forEach((m) => {
      // Set baseline income to the profile's Estimated Monthly Income for months that have data
      monthlyMap[m] = { income: totalIncome, expenses: 0, hasData: false };
    });

    expenses.forEach((e) => {
      const m = e.date.substring(0, 7); // YYYY-MM
      if (monthlyMap[m]) {
        monthlyMap[m].hasData = true;
        if (e.type === 'EXPENSE') {
          monthlyMap[m].expenses += e.amount;
        }
      }
    });

    const savingsTrend = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      income: Number(data.income.toFixed(2)),
      expenses: Number(data.expenses.toFixed(2)),
      savings: Number((data.income - data.expenses).toFixed(2)),
    }));

    const monthlySpendingTrend = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      amount: Number(data.expenses.toFixed(2)),
    }));

    // 6. Budget Usage Trend
    const categorySpending = await budgetService.calculateCategorySpending(userId);
    const budgetUsageTrend = categorySpending.map((item) => ({
      category: item.category,
      budget: item.budget,
      spent: item.spent,
      usagePercent: item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0,
    }));

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
