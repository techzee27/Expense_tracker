import { expenseRepository } from '@/repositories/expense.repository';
import { CreateExpenseDTO, Expense, UpdateExpenseDTO } from '@/models/expense.model';
import { profileRepository } from '@/repositories/profile.repository';
import { currencyService } from '@/services/currency.service';
import { SupportedCurrency } from '@/models/currency.model';

export class ExpenseService {
  async getExpenses(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      type?: 'INCOME' | 'EXPENSE';
      month?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ expenses: Expense[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    
    const { data, total } = await expenseRepository.findAll(userId, {
      ...filters,
      page,
      limit,
    });

    const converted = await this.getConvertedExpenses(userId, data);

    return {
      expenses: converted,
      total,
      page,
      limit,
    };
  }

  async getExpenseById(id: string, userId: string): Promise<Expense | null> {
    const expense = await expenseRepository.findById(id, userId);
    if (!expense) return null;
    const converted = await this.getConvertedExpenses(userId, [expense]);
    return converted[0];
  }

  async createExpense(userId: string, dto: CreateExpenseDTO): Promise<Expense> {
    const profile = await profileRepository.findById(userId);
    const targetCurrency = (profile?.currency || 'USD') as SupportedCurrency;
    const originalCurrency = (dto.originalCurrency || targetCurrency) as SupportedCurrency;
    const originalAmount = dto.amount;

    let exchangeRate = 1.0;
    if (originalCurrency !== targetCurrency) {
      try {
        const conversion = await currencyService.convert({
          amount: originalAmount,
          fromCurrency: originalCurrency,
          toCurrency: targetCurrency,
        });
        exchangeRate = conversion.rate;
      } catch (err) {
        console.error('Failed to fetch conversion rate, falling back to 1.0:', err);
      }
    }

    const convertedAmount = Number((originalAmount * exchangeRate).toFixed(2));

    return expenseRepository.create(userId, {
      ...dto,
      originalAmount,
      originalCurrency,
      exchangeRateAtEntry: exchangeRate,
      convertedAmount,
      amount: convertedAmount,
    });
  }

  async updateExpense(id: string, userId: string, dto: UpdateExpenseDTO): Promise<Expense> {
    const existing = await expenseRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Expense not found');
    }

    const originalCurrency = (dto.originalCurrency || existing.originalCurrency) as SupportedCurrency;
    const originalAmount = dto.amount !== undefined ? dto.amount : existing.originalAmount;

    const profile = await profileRepository.findById(userId);
    const targetCurrency = (profile?.currency || 'USD') as SupportedCurrency;

    let exchangeRate = 1.0;
    if (originalCurrency !== targetCurrency) {
      try {
        const conversion = await currencyService.convert({
          amount: originalAmount,
          fromCurrency: originalCurrency,
          toCurrency: targetCurrency,
        });
        exchangeRate = conversion.rate;
      } catch (err) {
        console.error('Failed to fetch conversion rate, falling back to 1.0:', err);
      }
    }

    const convertedAmount = Number((originalAmount * exchangeRate).toFixed(2));

    return expenseRepository.update(id, userId, {
      ...dto,
      originalAmount,
      originalCurrency,
      exchangeRateAtEntry: exchangeRate,
      convertedAmount,
      amount: convertedAmount,
    });
  }

  async deleteExpense(id: string, userId: string): Promise<void> {
    const existing = await expenseRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Expense not found');
    }
    return expenseRepository.delete(id, userId);
  }

  async getConvertedExpenses(userId: string, expenses: Expense[]): Promise<Expense[]> {
    if (expenses.length === 0) return [];

    const profile = await profileRepository.findById(userId);
    const preferredCurrency = (profile?.currency || 'USD') as SupportedCurrency;

    try {
      const ratesResult = await currencyService.getLatestRates(preferredCurrency);

      return expenses.map((e) => {
        if (e.originalCurrency === preferredCurrency) {
          return {
            ...e,
            amount: e.originalAmount,
          };
        }

        const rateToTarget = ratesResult.rates[e.originalCurrency as SupportedCurrency];
        if (rateToTarget !== undefined && rateToTarget > 0) {
          return {
            ...e,
            amount: Number((e.originalAmount / rateToTarget).toFixed(2)),
          };
        }

        return e;
      });
    } catch (err) {
      console.error('Failed to dynamically convert expenses for display, returning defaults:', err);
      return expenses;
    }
  }
}

export const expenseService = new ExpenseService();
