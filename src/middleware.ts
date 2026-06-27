import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Extract project ref (e.g. 'tzirpzhzmkjluswjflmo')
  const projectRef = supabaseUrl.split('.')[0].replace('https://', '');

  // 1. Clean up cookies from other Supabase projects running on localhost
  let cookiesDeleted = false;
  const response = NextResponse.next();
  
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-') && !cookie.name.includes(projectRef)) {
      response.cookies.delete(cookie.name);
      cookiesDeleted = true;
    }
  });

  if (cookiesDeleted) {
    // Redirect to the same URL to apply cookie deletions
    const redirectUrl = request.nextUrl.clone();
    const redirectResponse = NextResponse.redirect(redirectUrl);
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-') && !cookie.name.includes(projectRef)) {
        redirectResponse.cookies.delete(cookie.name);
      }
    });
    return redirectResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isDashboardRoute = path.startsWith('/dashboard');
  const isAuthRoute = path === '/login' || path === '/register';

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Web assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
