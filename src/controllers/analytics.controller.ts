'use server';

import { analyticsService } from '@/services/analytics.service';

export async function getAnalyticsSummaryAction(userId: string, timeRange?: 'day' | 'week' | 'month') {
  try {
    const summary = await analyticsService.getAnalyticsSummary(userId, timeRange);
    return {
      success: true,
      data: summary,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve analytics details',
    };
  }
}
