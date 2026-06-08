'use server';

import { expenseService } from '@/services/expense.service';
import { createExpenseSchema } from '@/models/expense.model';
import { revalidatePath } from 'next/cache';

export async function getExpensesAction(
  userId: string,
  filters?: {
    search?: string;
    category?: string;
    type?: 'INCOME' | 'EXPENSE';
    month?: string;
    page?: number;
    limit?: number;
  }
) {
  try {
    const result = await expenseService.getExpenses(userId, filters);
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve expenses',
    };
  }
}

export async function createExpenseAction(userId: string, payload: unknown) {
  try {
    const validated = createExpenseSchema.parse(payload);
    const expense = await expenseService.createExpense(userId, validated);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: expense,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create expense',
    };
  }
}

export async function updateExpenseAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createExpenseSchema.partial().parse(payload);
    const expense = await expenseService.updateExpense(id, userId, validated);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: expense,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update expense',
    };
  }
}

export async function deleteExpenseAction(id: string, userId: string) {
  try {
    await expenseService.deleteExpense(id, userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete expense',
    };
  }
}
