import { budgetRepository } from '@/repositories/budget.repository';
import { expenseRepository } from '@/repositories/expense.repository';
import { expenseService } from '@/services/expense.service';
import { Budget, CreateBudgetDTO, UpdateBudgetDTO } from '@/models/budget.model';
import { EXPENSE_CATEGORIES } from '@/models/expense.model';

export interface BudgetWithUsage extends Budget {
  usedAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
}

export interface CategorySpending {
  category: string;
  budget: number;
  spent: number;
}

export class BudgetService {
  async getBudgetsWithUsage(userId: string): Promise<BudgetWithUsage[]> {
    // Fetch all budgets
    const budgets = await budgetRepository.findAll(userId);

    // Fetch all expenses (to map usage in memory)
    const { data: rawExpenses } = await expenseRepository.findAll(userId);
    const expenses = await expenseService.getConvertedExpenses(userId, rawExpenses);

    return budgets.map((budget) => {
      // Filter expenses that are of type 'EXPENSE', matching category (case-insensitive) and within date range
      const matchingExpenses = expenses.filter((exp) => {
        if (exp.type !== 'EXPENSE') return false;
        if (exp.category.toLowerCase() !== budget.category.toLowerCase()) return false;
        
        const expDate = new Date(exp.date);
        const startDate = new Date(budget.startDate);
        const endDate = new Date(budget.endDate);
        
        // Reset hours/minutes/seconds to compare dates accurately
        expDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return expDate >= startDate && expDate <= endDate;
      });

      const usedAmount = matchingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const remainingAmount = Math.max(0, budget.amount - usedAmount);
      const utilizationPercentage = budget.amount > 0 ? Math.round((usedAmount / budget.amount) * 100) : 0;

      return {
        ...budget,
        usedAmount: Number(usedAmount.toFixed(2)),
        remainingAmount: Number(remainingAmount.toFixed(2)),
        utilizationPercentage,
      };
    });
  }

  /**
   * Reusable function to calculate spending per category.
   * Reads budgets from budgets table and actual spent from expenses table.
   * Matches category names, handling categories with budgets but no expenses,
   * and categories with expenses but no budgets.
   * Performs case-insensitive matching to prevent casing mismatches (e.g. "food" vs "Food").
   */
  async calculateCategorySpending(userId: string): Promise<CategorySpending[]> {
    // 1. Fetch budgets and expenses from Supabase via repositories
    const budgets = await budgetRepository.findAll(userId);
    const { data: rawExpenses } = await expenseRepository.findAll(userId);
    const expenses = await expenseService.getConvertedExpenses(userId, rawExpenses);

    const categoriesMap = new Map<string, { budget: number; spent: number }>();

    // Normalization helper: Standardizes category casing to match standard labels if matching case-insensitively
    const normalize = (cat: string) => {
      const standardMatch = EXPENSE_CATEGORIES.find(
        (c) => c.toLowerCase() === cat.toLowerCase()
      );
      return standardMatch || (cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
    };

    // 2. Sum budget per category
    budgets.forEach((b) => {
      const normalizedCat = normalize(b.category);
      const current = categoriesMap.get(normalizedCat) || { budget: 0, spent: 0 };
      categoriesMap.set(normalizedCat, {
        budget: current.budget + Number(b.amount),
        spent: current.spent,
      });
    });

    // 3. Sum expenses of type 'EXPENSE' per category
    expenses.forEach((e) => {
      if (e.type === 'EXPENSE') {
        const normalizedCat = normalize(e.category);
        const current = categoriesMap.get(normalizedCat) || { budget: 0, spent: 0 };
        categoriesMap.set(normalizedCat, {
          budget: current.budget,
          spent: current.spent + Number(e.amount),
        });
      }
    });

    // 4. Convert map to desired CategorySpending array
    const results: CategorySpending[] = [];
    categoriesMap.forEach((val, category) => {
      results.push({
        category,
        budget: Number(val.budget.toFixed(2)),
        spent: Number(val.spent.toFixed(2)),
      });
    });

    return results;
  }

  async createBudget(userId: string, dto: CreateBudgetDTO): Promise<Budget> {
    return budgetRepository.create(userId, dto);
  }

  async updateBudget(id: string, userId: string, dto: UpdateBudgetDTO): Promise<Budget> {
    return budgetRepository.update(id, userId, dto);
  }

  async deleteBudget(id: string, userId: string): Promise<void> {
    return budgetRepository.delete(id, userId);
  }
}

export const budgetService = new BudgetService();
