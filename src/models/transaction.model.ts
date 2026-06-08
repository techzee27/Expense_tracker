import { z } from 'zod';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionCategory =
  | 'TUITION'
  | 'RENT'
  | 'FOOD'
  | 'BOOKS'
  | 'TRANSPORT'
  | 'ENTERTAINMENT'
  | 'PART_TIME_JOB'
  | 'SCHOLARSHIP'
  | 'OTHER';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const createTransactionSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a valid number' })
    .positive('Amount must be greater than zero'),
  type: z.enum(['INCOME', 'EXPENSE'] as const, {
    message: 'Type must be INCOME or EXPENSE',
  }),
  category: z.enum(
    [
      'TUITION',
      'RENT',
      'FOOD',
      'BOOKS',
      'TRANSPORT',
      'ENTERTAINMENT',
      'PART_TIME_JOB',
      'SCHOLARSHIP',
      'OTHER',
    ] as const,
    { message: 'Please select a valid category' }
  ),
  description: z.string().max(255, 'Description is too long').nullable().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please select a valid date',
  }),
});

export type CreateTransactionDTO = z.infer<typeof createTransactionSchema>;
