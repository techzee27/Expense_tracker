'use server';

import { savingsGoalService } from '@/services/savings-goal.service';
import { createSavingsGoalSchema } from '@/models/savings-goal.model';
import { revalidatePath } from 'next/cache';

export async function getSavingsGoalsAction(userId: string) {
  try {
    const goals = await savingsGoalService.getSavingsGoals(userId);
    return {
      success: true,
      data: goals,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve savings goals',
    };
  }
}

export async function createSavingsGoalAction(userId: string, payload: unknown) {
  try {
    const validated = createSavingsGoalSchema.parse(payload);
    const goal = await savingsGoalService.createSavingsGoal(userId, validated);
    revalidatePath('/dashboard');
    return {
      success: true,
      data: goal,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create savings goal',
    };
  }
}

export async function updateSavingsGoalAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createSavingsGoalSchema.partial().parse(payload);
    const goal = await savingsGoalService.updateSavingsGoal(id, userId, validated);
    revalidatePath('/dashboard');
    return {
      success: true,
      data: goal,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update savings goal',
    };
  }
}

export async function deleteSavingsGoalAction(id: string, userId: string) {
  try {
    await savingsGoalService.deleteSavingsGoal(id, userId);
    revalidatePath('/dashboard');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete savings goal',
    };
  }
}
