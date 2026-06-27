import { z } from 'zod';
import { EXPENSE_CATEGORIES } from './expense.model';

export type RecurringExpenseInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurringExpenseStatus = 'ACTIVE' | 'PAUSED';

export interface RecurringExpense {
  id: string;
  userId: string;
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  exchangeRateAtEntry: number;
  convertedAmount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string | null;
  merchant: string | null;
  interval: RecurringExpenseInterval;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  lastProcessedDate: string | null;
  status: RecurringExpenseStatus;
  createdAt: string;
  updatedAt: string;
}

export const createRecurringExpenseSchema = z.object({
  amount: z.number({ message: 'Amount must be a valid number' }).positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE'] as const, { message: 'Type must be INCOME or EXPENSE' }),
  category: z.enum(EXPENSE_CATEGORIES, { message: 'Invalid category' }),
  description: z.string().max(255).nullable().optional(),
  merchant: z.string().max(100).nullable().optional(),
  interval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const, { message: 'Invalid interval' }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date format' }).nullable().optional(),
  originalCurrency: z.string().length(3).optional(),
  status: z.enum(['ACTIVE', 'PAUSED'] as const).optional(),
});

export type CreateRecurringExpenseDTO = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateRecurringExpenseDTO = Partial<CreateRecurringExpenseDTO>;
