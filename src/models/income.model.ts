import { z } from 'zod';

export const INCOME_CATEGORIES = [
  'Pocket Money',
  'Family Support',
  'Part-Time Job',
  'Freelancing',
  'Scholarship',
  'Rewards & Cashback',
  'Gifts',
  'Refunds',
  'Reimbursements',
  'Selling Items',
  'Loan Received',
  'Other Income',
] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number];
export type IncomeSource = 'MANUAL' | 'EMAIL' | 'MESSAGE';
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Income {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  payer: string | null;
  source: IncomeSource;
  recurring: boolean;
  recurringScheduleId: string | null;
  transactionDate: string;
  smsId?: string | null;
  senderId?: string | null;
  paymentMethod?: string | null;
  accountReference?: string | null;
  transactionTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringIncomeSchedule {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  payer: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextExecutionDate: string;
  active: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createIncomeSchema = z.object({
  amount: z.number({ message: 'Amount must be a valid number' }).positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(255).nullable().optional(),
  payer: z.string().max(100).nullable().optional(),
  source: z.enum(['MANUAL', 'EMAIL', 'MESSAGE'] as const).optional(),
  recurring: z.boolean().optional(),
  recurringScheduleId: z.string().uuid().nullable().optional(),
  transactionDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  smsId: z.string().nullable().optional(),
  senderId: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  accountReference: z.string().nullable().optional(),
  transactionTime: z.string().nullable().optional(),
});

export type CreateIncomeDTO = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeDTO = Partial<CreateIncomeDTO>;

export const createRecurringScheduleSchema = z.object({
  amount: z.number({ message: 'Amount must be a valid number' }).positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  category: z.string().min(1, 'Category is required'),
  payer: z.string().max(100).nullable().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
  endDate: z.string().nullable().optional(),
  description: z.string().max(255).nullable().optional(),
});

export type CreateRecurringScheduleDTO = z.infer<typeof createRecurringScheduleSchema>;
export type UpdateRecurringScheduleDTO = Partial<CreateRecurringScheduleDTO> & { active?: boolean };
