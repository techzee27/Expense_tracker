import { recurringExpenseRepository } from '@/repositories/recurring-expense.repository';
import { expenseRepository } from '@/repositories/expense.repository';
import { CreateRecurringExpenseDTO, RecurringExpense, UpdateRecurringExpenseDTO } from '@/models/recurring-expense.model';
import { profileRepository } from '@/repositories/profile.repository';
import { currencyService } from '@/services/currency.service';
import { SupportedCurrency } from '@/models/currency.model';

export class RecurringExpenseService {
  async getRecurringExpenses(userId: string, filters?: { status?: 'ACTIVE' | 'PAUSED' }): Promise<RecurringExpense[]> {
    return recurringExpenseRepository.findAll(userId, filters);
  }

  async getRecurringExpenseById(id: string, userId: string): Promise<RecurringExpense | null> {
    return recurringExpenseRepository.findById(id, userId);
  }

  async createRecurringExpense(userId: string, dto: CreateRecurringExpenseDTO): Promise<RecurringExpense> {
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

    // Next due date starts on the start date
    const nextDueDate = dto.startDate;

    const created = await recurringExpenseRepository.create(userId, {
      ...dto,
      originalAmount,
      originalCurrency,
      exchangeRateAtEntry: exchangeRate,
      convertedAmount,
      amount: convertedAmount,
      nextDueDate,
    });

    // Run processing immediately in case start date is today or in the past
    await this.processRecurringExpenses(userId);

    return created;
  }

  async updateRecurringExpense(id: string, userId: string, dto: UpdateRecurringExpenseDTO): Promise<RecurringExpense> {
    const existing = await recurringExpenseRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Recurring expense not found');
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

    // If start date changed, update next due date if we haven't processed it yet
    let nextDueDate = existing.nextDueDate;
    if (dto.startDate && dto.startDate !== existing.startDate && !existing.lastProcessedDate) {
      nextDueDate = dto.startDate;
    }

    const updated = await recurringExpenseRepository.update(id, userId, {
      ...dto,
      originalAmount,
      originalCurrency,
      exchangeRateAtEntry: exchangeRate,
      convertedAmount,
      amount: convertedAmount,
      nextDueDate,
    });

    // Run processing immediately in case update changes the schedule
    await this.processRecurringExpenses(userId);

    return updated;
  }

  async deleteRecurringExpense(id: string, userId: string): Promise<void> {
    await recurringExpenseRepository.delete(id, userId);
  }

  async processRecurringExpenses(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const recurringList = await recurringExpenseRepository.findAll(userId, { status: 'ACTIVE' });

    for (const recurring of recurringList) {
      let currentDueDate = new Date(recurring.nextDueDate);
      currentDueDate.setHours(0, 0, 0, 0);

      let lastProcessedDateStr = recurring.lastProcessedDate;
      let nextDueDateStr = recurring.nextDueDate;
      let updated = false;

      while (currentDueDate <= today) {
        const dateStr = currentDueDate.toISOString().split('T')[0];

        // Insert into expenses
        await expenseRepository.create(userId, {
          amount: recurring.amount,
          type: recurring.type,
          category: recurring.category as any,
          description: recurring.description || `Recurring: ${recurring.category}`,
          date: dateStr,
          originalAmount: recurring.originalAmount,
          originalCurrency: recurring.originalCurrency,
          exchangeRateAtEntry: recurring.exchangeRateAtEntry,
          convertedAmount: recurring.convertedAmount,
          source: 'RECURRING',
          merchant: recurring.merchant,
          approved: true,
          recurring: true,
          recurringId: recurring.id,
        });

        // Set last processed date
        lastProcessedDateStr = dateStr;
        updated = true;

        // Calculate next due date
        if (recurring.interval === 'DAILY') {
          currentDueDate.setDate(currentDueDate.getDate() + 1);
        } else if (recurring.interval === 'WEEKLY') {
          currentDueDate.setDate(currentDueDate.getDate() + 7);
        } else if (recurring.interval === 'MONTHLY') {
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        } else if (recurring.interval === 'YEARLY') {
          currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
        }

        nextDueDateStr = currentDueDate.toISOString().split('T')[0];

        // Check if there is an end date and we have passed it
        if (recurring.endDate && new Date(nextDueDateStr) > new Date(recurring.endDate)) {
          break;
        }
      }

      if (updated) {
        // Update recurring expense record with last processed date and next due date
        const isCompleted = recurring.endDate && new Date(nextDueDateStr) > new Date(recurring.endDate);
        await recurringExpenseRepository.update(recurring.id, userId, {
          lastProcessedDate: lastProcessedDateStr,
          nextDueDate: nextDueDateStr,
          status: isCompleted ? 'PAUSED' : recurring.status, // Pause completed schedules
        });
      }
    }
  }
}

export const recurringExpenseService = new RecurringExpenseService();
