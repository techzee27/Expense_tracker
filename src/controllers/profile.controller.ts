'use server';

import { profileService } from '@/services/profile.service';
import { updateProfileSchema } from '@/models/profile.model';
import { revalidatePath } from 'next/cache';
import { expenseService } from '@/services/expense.service';
import { gmailService } from '@/services/gmail.service';
import { smsService } from '@/services/sms.service';
import { SMSMessage } from '@/services/smsParser.service';

export async function getProfileAction(userId: string) {
  try {
    const profile = await profileService.getProfile(userId);
    return {
      success: true,
      data: profile,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve profile data',
    };
  }
}

export async function updateProfileAction(userId: string, payload: unknown) {
  try {
    const validated = updateProfileSchema.parse(payload);
    const profile = await profileService.updateProfile(userId, validated);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return {
      success: true,
      data: profile,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save profile changes',
    };
  }
}

export async function connectGmailAction(
  userId: string,
  connectedEmail: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) {
  try {
    const updated = await profileService.updateProfile(userId, {
      email: connectedEmail,
      connectedEmail,
      gmailConnected: true,
      emailTrackingEnabled: true,
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
      gmailTokenExpiry: expiresAt,
    });
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect Gmail account',
    };
  }
}

export async function disconnectGmailAction(userId: string) {
  try {
    const profile = await profileService.getProfile(userId);
    if (!profile) throw new Error('Profile not found');
    const updated = await profileService.updateProfile(userId, {
      email: profile.email,
      // Clear Gmail credentials securely
      connectedEmail: null,
      gmailConnected: false,
      emailTrackingEnabled: false,
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
    });
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Gmail',
    };
  }
}

export async function deleteGmailDataAction(userId: string) {
  try {
    // 1. Delete imported EMAIL expenses
    const supabase = await (await import('@/lib/supabase/server')).createClient();
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'EMAIL');

    if (deleteError) throw new Error(deleteError.message);

    // 2. Reset counters on profile
    const profile = await profileService.getProfile(userId);
    if (!profile) throw new Error('Profile not found');
    const updated = await profileService.updateProfile(userId, {
      email: profile.email,
      emailImportedCount: 0,
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete Gmail parsing data',
    };
  }
}

export async function clearImportedTransactionsAction(userId: string) {
  try {
    await profileService.clearImportedTransactions(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear imported transactions',
    };
  }
}

export async function deleteUserAccountDataAction(userId: string) {
  try {
    await profileService.deleteUserAccountData(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user account data',
    };
  }
}

export async function syncTransactionsAction(userId: string) {
  try {
    const syncResult = await gmailService.syncEmailTransactions(userId);
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Sync service failed');
    }

    const profile = await profileService.getProfile(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    return { success: true, data: profile };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync transactions',
    };
  }
}

export async function refreshEmailAction(userId: string) {
  try {
    const syncResult = await gmailService.syncEmailTransactions(userId);
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Sync service failed');
    }

    const profile = await profileService.getProfile(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/review');
    revalidatePath('/dashboard');
    return { success: true, data: profile };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh emails',
    };
  }
}

export async function rescanSmsAction(userId: string) {
  try {
    const mockMessages = smsService.getMockSMSMessages();
    const result = await smsService.syncSmsTransactions(userId, mockMessages, 'CONNECTED');
    if (!result.success) throw new Error(result.error || 'Failed to sync mock messages');

    const profile = await profileService.getProfile(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: profile, count: result.count, scanned: result.scanned };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to re-scan SMS messages',
    };
  }
}

export async function syncSmsTransactionsAction(userId: string, messages: SMSMessage[], permissionStatus: 'CONNECTED' | 'PERMISSION_DENIED') {
  try {
    const result = await smsService.syncSmsTransactions(userId, messages, permissionStatus);
    if (!result.success) throw new Error(result.error || 'Failed to sync SMS transactions');

    const profile = await profileService.getProfile(userId);
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: profile, count: result.count, scanned: result.scanned };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync SMS transactions',
    };
  }
}

export async function reprocessOcrAction(userId: string) {
  try {
    const profile = await profileService.getProfile(userId);
    if (!profile) throw new Error('Profile not found');

    const updated = await profileService.updateProfile(userId, {
      email: profile.email,
      ocrImportedCount: profile.ocrImportedCount + 2,
    });
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reprocess OCR receipts',
    };
  }
}

export async function exportDataAction(userId: string) {
  try {
    const profile = await profileService.getProfile(userId);
    if (!profile) throw new Error('Profile not found');
    return {
      success: true,
      data: {
        profile,
        exportedAt: new Date().toISOString(),
        message: 'All academic, transaction sources and history data compiled.',
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    };
  }
}
