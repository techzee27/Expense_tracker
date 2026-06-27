'use server';

import { incomeService } from '@/services/income.service';
import { createIncomeSchema, createRecurringScheduleSchema } from '@/models/income.model';
import { revalidatePath } from 'next/cache';

// Incomes Actions
export async function getIncomesAction(
  userId: string,
  filters?: {
    search?: string;
    category?: string;
    source?: string;
    month?: string;
    page?: number;
    limit?: number;
  }
) {
  try {
    const result = await incomeService.getIncomes(userId, filters);
    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve income data',
    };
  }
}

export async function createIncomeAction(userId: string, payload: unknown) {
  try {
    const validated = createIncomeSchema.parse(payload);
    const income = await incomeService.createIncome(userId, validated);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: income,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create income record',
    };
  }
}

export async function updateIncomeAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createIncomeSchema.partial().parse(payload);
    const income = await incomeService.updateIncome(id, userId, validated);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: income,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update income record',
    };
  }
}

export async function deleteIncomeAction(id: string, userId: string) {
  try {
    await incomeService.deleteIncome(id, userId);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete income record',
    };
  }
}

// Recurring Schedules Actions
export async function getSchedulesAction(userId: string) {
  try {
    const schedules = await incomeService.getSchedules(userId);
    return {
      success: true,
      data: schedules,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve recurring schedules',
    };
  }
}

export async function createScheduleAction(userId: string, payload: unknown) {
  try {
    const validated = createRecurringScheduleSchema.parse(payload);
    const schedule = await incomeService.createSchedule(userId, validated);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: schedule,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recurring schedule',
    };
  }
}

export async function updateScheduleAction(id: string, userId: string, payload: unknown) {
  try {
    const validated = createRecurringScheduleSchema.partial().parse(payload);
    const schedule = await incomeService.updateSchedule(id, userId, validated);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: schedule,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recurring schedule',
    };
  }
}

export async function deleteScheduleAction(id: string, userId: string) {
  try {
    await incomeService.deleteSchedule(id, userId);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete recurring schedule',
    };
  }
}

export async function setScheduleActiveAction(id: string, userId: string, active: boolean) {
  try {
    const schedule = await incomeService.setScheduleActive(id, userId, active);
    revalidatePath('/dashboard/income');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: schedule,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle recurring schedule status',
    };
  }
}

export async function getIncomeAnalyticsAction(userId: string) {
  try {
    const analytics = await incomeService.getIncomeAnalytics(userId);
    return {
      success: true,
      data: analytics,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compile income analytics',
    };
  }
}

export async function getExpectedMonthlyIncomeAction(userId: string) {
  try {
    const data = await incomeService.getExpectedMonthlyIncome(userId);
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compile expected income',
    };
  }
}
