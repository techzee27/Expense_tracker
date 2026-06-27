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

  // Extended fields
  countryOfStudy: string | null;
  cityOfStudy: string | null;
  preferredCurrency: string | null;
  smsTrackingEnabled: boolean;
  emailTrackingEnabled: boolean;
  lastSmsSync: string | null;
  lastEmailSync: string | null;
  smsImportedCount: number;
  emailImportedCount: number;
  ocrImportedCount: number;
  manualTransactionCount: number;
  connectedEmail: string | null;
  gmailConnected: boolean;
  gmailAccessToken: string | null;
  gmailRefreshToken: string | null;
  gmailTokenExpiry: string | null;
  authProvider: string;
  googleConnected: boolean;
  
  // New SMS fields
  smsPermissionStatus: 'NOT_CONNECTED' | 'PERMISSION_REQUIRED' | 'CONNECTED' | 'PERMISSION_DENIED';
  smsMessagesScanned: number;
  lastSmsScan: string | null;

  // Onboarding fields
  introScreensCompleted: boolean;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  lastCompletedStep: number;
  homeCity: string | null;
  homeCurrency: { code: string; symbol: string; name: string } | null;
  studyCurrency: { code: string; symbol: string; name: string } | null;
  showHomeCurrency: boolean;
}

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  email: z.string().email('Invalid email address'),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional().or(z.literal('')),
  currency: z.string().length(3, 'Currency code must be exactly 3 characters (e.g. USD, EUR)').optional(),
  university: z.string().max(150).nullable().optional().or(z.literal('')),
  studyCountry: z.string().min(2, 'Study Country must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  studyCity: z.string().min(2, 'Study City must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  homeCountry: z.string().min(2, 'Home Country must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  monthlyIncome: z.number({ message: 'Income must be a valid number' }).nonnegative('Income cannot be negative').optional(),

  // Extended fields
  countryOfStudy: z.string().min(2, 'Country of study must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  cityOfStudy: z.string().min(2, 'City of study must be at least 2 characters').max(100).nullable().optional().or(z.literal('')),
  preferredCurrency: z.string().length(3, 'Preferred currency must be exactly 3 characters (e.g. USD, EUR)').nullable().optional().or(z.literal('')),
  smsTrackingEnabled: z.boolean().optional(),
  emailTrackingEnabled: z.boolean().optional(),
  lastSmsSync: z.string().nullable().optional().or(z.literal('')),
  lastEmailSync: z.string().nullable().optional().or(z.literal('')),
  smsImportedCount: z.number().optional(),
  emailImportedCount: z.number().optional(),
  ocrImportedCount: z.number().optional(),
  manualTransactionCount: z.number().optional(),
  connectedEmail: z.string().email('Invalid email address').nullable().optional().or(z.literal('')),
  gmailConnected: z.boolean().optional(),
  gmailAccessToken: z.string().nullable().optional().or(z.literal('')),
  gmailRefreshToken: z.string().nullable().optional().or(z.literal('')),
  gmailTokenExpiry: z.string().nullable().optional().or(z.literal('')),
  authProvider: z.string().optional(),
  googleConnected: z.boolean().optional(),
  smsPermissionStatus: z.enum(['NOT_CONNECTED', 'PERMISSION_REQUIRED', 'CONNECTED', 'PERMISSION_DENIED'] as const).optional(),
  smsMessagesScanned: z.number().optional(),
  lastSmsScan: z.string().nullable().optional().or(z.literal('')),

  // Onboarding fields
  introScreensCompleted: z.boolean().optional(),
  profileCompleted: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  lastCompletedStep: z.number().optional(),
  homeCity: z.string().nullable().optional().or(z.literal('')),
  homeCurrency: z.object({ code: z.string(), symbol: z.string(), name: z.string() }).nullable().optional(),
  studyCurrency: z.object({ code: z.string(), symbol: z.string(), name: z.string() }).nullable().optional(),
  showHomeCurrency: z.boolean().optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
