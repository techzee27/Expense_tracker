'use server';

import { goalAllocationRepository } from '@/repositories/goal-allocation.repository';
import { revalidatePath } from 'next/cache';

export async function allocateSavingsAction(
  goalId: string,
  amount: number,
  date: string,
  source = 'MONTHLY_SAVINGS'
) {
  try {
    const allocation = await goalAllocationRepository.create(goalId, amount, date, source);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/budgets');
    return {
      success: true,
      data: allocation,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to allocate savings',
    };
  }
}

export async function getGoalAllocationsAction(goalId: string) {
  try {
    const allocations = await goalAllocationRepository.findAllByGoalId(goalId);
    return {
      success: true,
      data: allocations,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch allocations',
    };
  }
}

export async function deleteAllocationAction(id: string) {
  try {
    await goalAllocationRepository.delete(id);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/budgets');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete allocation',
    };
  }
}
