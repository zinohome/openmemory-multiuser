// ui/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protected routes that require authentication
  const protectedPaths = ['/memories', '/settings', '/apps'];
  
  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));
  
  if (isProtectedPath) {
    // Check for API key in cookie (set by login page)
    // Note: In production, you'd want to validate this server-side
    const hasAuth = request.cookies.get('om_auth');
    
    if (!hasAuth) {
      // Redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Redirect root to memories if authenticated, login if not
  if (path === '/') {
    const hasAuth = request.cookies.get('om_auth');
    if (hasAuth) {
      return NextResponse.redirect(new URL('/memories', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};