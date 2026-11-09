import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // Unauthenticated user accessing login page
  if (pathname === '/login' || pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // If accessing root, show login
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Not authenticated accessing protected routes
  if (!user) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route gating
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (
    (pathname.startsWith('/shipments/new') ||
      pathname.startsWith('/upcoming/new') ||
      pathname.startsWith('/payment-options')) &&
    user.role === 'VIEW'
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
