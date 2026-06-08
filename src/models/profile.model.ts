import { z } from 'zod';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  currency: string;
  university: string | null;
  studyCountry: string | null;
  studyCity: string | null;
  homeCountry: string | null;
  monthlyIncome: number;
  createdAt: string;
  updatedAt: string;
}

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100).nullable().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
  currency: z.string().length(3, 'Currency code must be exactly 3 characters (e.g. USD, EUR)'),
  university: z.string().max(150).nullable().optional(),
  studyCountry: z.string().min(2, 'Study Country must be at least 2 characters').max(100).nullable().optional(),
  studyCity: z.string().min(2, 'Study City must be at least 2 characters').max(100).nullable().optional(),
  homeCountry: z.string().min(2, 'Home Country must be at least 2 characters').max(100).nullable().optional(),
  monthlyIncome: z.number({ message: 'Income must be a valid number' }).nonnegative('Income cannot be negative'),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
