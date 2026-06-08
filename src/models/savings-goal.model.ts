import { z } from 'zod';

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  targetAmount: z.number({ message: 'Target amount must be a number' }).positive('Target must be positive'),
  currentAmount: z.number().nonnegative('Current amount cannot be negative').default(0),
  targetDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid target date' })
    .nullable()
    .optional(),
});

export type CreateSavingsGoalDTO = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalDTO = Partial<CreateSavingsGoalDTO>;
