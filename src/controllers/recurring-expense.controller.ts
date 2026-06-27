'use server';

import { recurringExpenseService } from '@/services/recurring-expense.service';
import { createRecurringExpenseSchema } from '@/models/recurring-expense.model';
import { revalidatePath } from 'next/cache';

export async function getRecurringExpensesAction(
  userId: string,
  filters?: { status?: 'ACTIVE' | 'PAUSED' }
) {
  try {
    const data = await recurringExpenseService.getRecurringExpenses(userId, filters);
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve recurring expenses',
    };
  }
}

export async function createRecurringExpenseAction(userId: string, payload: unknown) {
  try {
    const validated = createRecurringExpenseSchema.parse(payload);
    const result = await recurringExpenseService.createRecurringExpense(userId, validated);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recurring expense',
    };
  }
}

export async function updateRecurringExpenseAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createRecurringExpenseSchema.partial().parse(payload);
    const result = await recurringExpenseService.updateRecurringExpense(id, userId, validated);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recurring expense',
    };
  }
}

export async function deleteRecurringExpenseAction(id: string, userId: string) {
  try {
    await recurringExpenseService.deleteRecurringExpense(id, userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete recurring expense',
    };
  }
}

export async function processRecurringExpensesAction(userId: string) {
  try {
    await recurringExpenseService.processRecurringExpenses(userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process recurring expenses',
    };
  }
}
