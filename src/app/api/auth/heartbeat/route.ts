import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, createSessionToken, COOKIE_NAME, INACTIVITY_TIMEOUT_SECONDS } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      redirect: '/login?timeout=1',
    });
  }

  // Refresh token with current timestamp
  const newToken = await createSessionToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  const response = NextResponse.json({
    authenticated: true,
  });

  response.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: INACTIVITY_TIMEOUT_SECONDS,
  });

  return response;
}
