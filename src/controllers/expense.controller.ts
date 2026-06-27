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
    source?: string;
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

import { hindsightService } from '@/services/hindsight.service';

export async function updateExpenseAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createExpenseSchema.partial().parse(payload);
    
    // Fetch original expense to check if properties were corrected
    const original = await expenseService.getExpenseById(id, userId);
    if (original && validated.approved) {
      if (
        (validated.category && validated.category !== original.category) ||
        (validated.merchant && validated.merchant !== original.merchant)
      ) {
        await hindsightService.learnFromOcrCorrection(
          userId,
          validated.merchant || original.merchant || 'Miscellaneous',
          original.category,
          validated.category || original.category
        );
      }
    }

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

export async function getUnapprovedExpensesAction(userId: string) {
  try {
    const expenses = await expenseService.getUnapprovedExpenses(userId);
    return {
      success: true,
      data: expenses,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve unapproved expenses',
    };
  }
}

export async function approveExpenseAction(id: string, userId: string) {
  try {
    const expense = await expenseService.approveExpense(id, userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: expense,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve expense',
    };
  }
}

export async function rejectExpenseAction(id: string, userId: string) {
  try {
    await expenseService.rejectExpense(id, userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject expense',
    };
  }
}

export async function mergeExpenseAction(id: string, targetId: string, userId: string) {
  try {
    await expenseService.mergeExpense(id, targetId, userId);
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge expenses',
    };
  }
}
