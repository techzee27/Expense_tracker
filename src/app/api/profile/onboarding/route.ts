import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { profileService } from '@/services/profile.service';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId,
      fullName,
      homeCountry,
      homeCity,
      homeCurrency,
      studyCountry,
      studyCity,
      studyCurrency,
      preferredCurrency,
      lastCompletedStep,
      introScreensCompleted,
      profileCompleted,
      onboardingCompleted,
    } = body;

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await profileService.updateProfile(user.id, {
      fullName,
      homeCountry,
      homeCity,
      homeCurrency,
      studyCountry,
      studyCity,
      studyCurrency,
      preferredCurrency: preferredCurrency?.code || null,
      lastCompletedStep,
      introScreensCompleted,
      profileCompleted,
      onboardingCompleted,
      email: user.email || '',
      // Keep legacy fields in sync
      countryOfStudy: studyCountry,
      cityOfStudy: studyCity,
      currency: preferredCurrency?.code || 'USD',
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Onboarding API route failure:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
