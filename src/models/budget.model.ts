import { z } from 'zod';
import { EXPENSE_CATEGORIES } from './expense.model';

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export const createBudgetSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES, { message: 'Invalid category' }),
    amount: z.number({ message: 'Amount must be a valid number' }).positive('Budget amount must be positive'),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
  })
  .refine((data) => Date.parse(data.startDate) <= Date.parse(data.endDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CreateBudgetDTO = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetDTO = Partial<CreateBudgetDTO>;
