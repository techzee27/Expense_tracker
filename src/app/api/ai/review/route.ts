import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { financialIntelligenceService } from '@/services/financial-intelligence.service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run review generation and forecasting concurrently
    const [review, forecast] = await Promise.all([
      financialIntelligenceService.generateMonthlyReview(user.id),
      financialIntelligenceService.getForecasts(user.id)
    ]);

    return NextResponse.json({
      review,
      forecast
    });
  } catch (err: any) {
    console.error('AI Review route failure:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
