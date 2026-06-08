'use server';

import { budgetService } from '@/services/budget.service';
import { createBudgetSchema } from '@/models/budget.model';
import { revalidatePath } from 'next/cache';

export async function getBudgetsWithUsageAction(userId: string) {
  try {
    const budgets = await budgetService.getBudgetsWithUsage(userId);
    return {
      success: true,
      data: budgets,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve budgets',
    };
  }
}

export async function createBudgetAction(userId: string, payload: unknown) {
  try {
    const validated = createBudgetSchema.parse(payload);
    const budget = await budgetService.createBudget(userId, validated);
    revalidatePath('/dashboard/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: budget,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create budget',
    };
  }
}

export async function updateBudgetAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createBudgetSchema.partial().parse(payload);
    const budget = await budgetService.updateBudget(id, userId, validated);
    revalidatePath('/dashboard/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
      data: budget,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update budget',
    };
  }
}

export async function deleteBudgetAction(id: string, userId: string) {
  try {
    await budgetService.deleteBudget(id, userId);
    revalidatePath('/dashboard/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete budget',
    };
  }
}
