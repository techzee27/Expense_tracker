import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { financialIntelligenceService } from '@/services/financial-intelligence.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question in request body' }, { status: 400 });
    }

    const response = await financialIntelligenceService.askQuestion(user.id, question);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('AI Chat route failure:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
