import { z } from 'zod';

export interface CostOfLiving {
  id: string;
  city: string;
  country: string;
  indexScore: number;
  estimatedMonthlyCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export const createCostOfLivingSchema = z.object({
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  indexScore: z.number().positive('Index score must be positive'),
  estimatedMonthlyCost: z.number().positive('Monthly cost estimation must be positive').nullable().optional(),
});

export type CreateCostOfLivingDTO = z.infer<typeof createCostOfLivingSchema>;
export type UpdateCostOfLivingDTO = Partial<CreateCostOfLivingDTO>;
