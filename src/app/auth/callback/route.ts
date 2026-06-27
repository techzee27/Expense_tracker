import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isGoogle = user.app_metadata?.provider === 'google';
        if (isGoogle) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
          
          // Check if profile already exists to avoid overwriting student details
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (existingProfile) {
            // Update only auth fields and empty name/avatar to preserve student details
            await supabase
              .from('profiles')
              .update({
                auth_provider: 'GOOGLE',
                google_connected: true,
                full_name: existingProfile.full_name || fullName,
                avatar_url: existingProfile.avatar_url || avatarUrl,
              })
              .eq('id', user.id);
          } else {
            // Insert a new profile if none exists
            await supabase.from('profiles').insert({
              id: user.id,
              email: user.email || user.user_metadata?.email || '',
              full_name: fullName,
              avatar_url: avatarUrl,
              auth_provider: 'GOOGLE',
              google_connected: true,
            });
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login page on authentication failure
  return NextResponse.redirect(
    `${origin}/login?error=Authentication%20failed.%20Please%20try%20signing%20in%20again.`
  );
}
