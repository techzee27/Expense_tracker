'use server';

import { transactionService } from '@/services/transaction.service';
import { createTransactionSchema } from '@/models/transaction.model';
import { revalidatePath } from 'next/cache';

export async function getDashboardData(userId: string) {
  try {
    const summary = await transactionService.getDashboardSummary(userId);
    return {
      success: true,
      data: summary,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
    };
  }
}

export async function createTransactionAction(userId: string, payload: unknown) {
  try {
    const validated = createTransactionSchema.parse(payload);
    const transaction = await transactionService.addTransaction(userId, validated);
    revalidatePath('/dashboard');
    return {
      success: true,
      data: transaction,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
    };
  }
}

export async function deleteTransactionAction(id: string, userId: string) {
  try {
    await transactionService.deleteTransaction(id, userId);
    revalidatePath('/dashboard');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete transaction',
    };
  }
}
