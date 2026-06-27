'use server';

import { hindsightService } from '@/services/hindsight.service';

export async function learnUserPreferenceAction(userId: string, adviceKey: string, accepted: boolean) {
  try {
    const success = await hindsightService.learnUserPreference(userId, adviceKey, accepted);
    return { success };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save preference' };
  }
}
