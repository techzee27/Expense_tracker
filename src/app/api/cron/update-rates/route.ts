import { NextResponse } from 'next/server';
import { currencyService } from '@/services/currency.service';
import { SUPPORTED_CURRENCIES } from '@/models/currency.model';

export async function GET(request: Request) {
  // Verify authorization bearer token
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET || 'default_secret';
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('Daily cron job started: updating currency exchange rates...');
    // Fetch and cache rates for each supported currency
    for (const base of SUPPORTED_CURRENCIES) {
      await currencyService.getLatestRates(base);
    }
    console.log('Daily cron job succeeded: all exchange rates updated.');
    return NextResponse.json({ success: true, message: 'All currency rates updated and cached successfully' });
  } catch (error: any) {
    console.error('Daily cron job failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
