import { z } from 'zod';
import { EXPENSE_CATEGORIES } from './expense.model';

export type ReceiptProcessingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Receipt {
  id: string;
  userId: string;
  fileUrl: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
  confidenceScore: number;
  processingStatus: ReceiptProcessingStatus;
  currency: string | null;
  createdAt: string;
}

export const createReceiptSchema = z.object({
  fileUrl: z.string().url('File URL must be a valid URL'),
  merchant: z.string().max(100).nullable().optional(),
  amount: z.number().nullable().optional(),
  date: z.string().nullable().optional(),
  category: z.enum(EXPENSE_CATEGORIES).nullable().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  processingStatus: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const).optional(),
  currency: z.string().length(3).nullable().optional(),
});

export type CreateReceiptDTO = z.infer<typeof createReceiptSchema>;
export type UpdateReceiptDTO = Partial<CreateReceiptDTO>;
