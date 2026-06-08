'use server';

import { profileService } from '@/services/profile.service';
import { updateProfileSchema } from '@/models/profile.model';
import { revalidatePath } from 'next/cache';

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
