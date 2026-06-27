import { z } from 'zod';

export type ExpenseType = 'INCOME' | 'EXPENSE';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Education',
  'Shopping',
  'Entertainment',
  'Hostel/Rent',
  'Health',
  'Subscriptions',
  'Miscellaneous',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  exchangeRateAtEntry: number;
  convertedAmount: number;
  type: ExpenseType;
  category: string;
  description: string | null;
  date: string;
  source: 'MANUAL' | 'MESSAGE' | 'OCR' | 'EMAIL' | 'SMS' | 'OCR_RECEIPT' | 'RECURRING';
  merchant: string | null;
  receiptFilename: string | null;
  receiptUrl: string | null;
  ocrConfidence: number | null;
  emailConfidence: number | null;
  importedAt: string | null;
  approved: boolean;
  duplicateFlag: boolean;
  createdAt: string;
  updatedAt: string;
  
  // SMS Tracking fields
  smsId?: string | null;
  senderId?: string | null;
  paymentMethod?: string | null;
  accountReference?: string | null;
  transactionTime?: string | null;

  // Recurring fields
  recurring?: boolean;
  recurringId?: string | null;
}

export const createExpenseSchema = z.object({
  amount: z.number({ message: 'Amount must be a valid number' }).positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE'] as const, { message: 'Type must be INCOME or EXPENSE' }),
  category: z.enum(EXPENSE_CATEGORIES, { message: 'Invalid category' }),
  description: z.string().max(255).nullable().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  originalCurrency: z.string().length(3).optional(),
  source: z.enum(['MANUAL', 'MESSAGE', 'OCR', 'EMAIL', 'SMS', 'OCR_RECEIPT', 'RECURRING'] as const).optional(),
  merchant: z.string().max(100).nullable().optional(),
  receiptFilename: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  ocrConfidence: z.number().nullable().optional(),
  emailConfidence: z.number().nullable().optional(),
  importedAt: z.string().nullable().optional(),
  approved: z.boolean().optional(),
  duplicateFlag: z.boolean().optional(),
  smsId: z.string().nullable().optional(),
  senderId: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  accountReference: z.string().nullable().optional(),
  transactionTime: z.string().nullable().optional(),
  recurring: z.boolean().optional(),
  recurringId: z.string().nullable().optional(),
});

export type CreateExpenseDTO = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDTO = Partial<CreateExpenseDTO>;
