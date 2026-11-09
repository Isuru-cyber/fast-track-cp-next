import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSessionToken, COOKIE_NAME, INACTIVITY_TIMEOUT_SECONDS } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { checkLoginRateLimit, recordFailedLogin, clearLoginRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const trimmedUser = String(username).trim();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitKey = `${ip}:${trimmedUser.toLowerCase()}`;

    const limitStatus = checkLoginRateLimit(rateLimitKey);
    if (limitStatus.blocked) {
      const retryMins = Math.ceil((limitStatus.retryAfterSeconds || 900) / 60);
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again after ${retryMins} minutes.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: trimmedUser },
    });

    if (!user) {
      const attempt = recordFailedLogin(rateLimitKey);
      if (attempt.blocked) {
        return NextResponse.json(
          { error: 'Too many failed login attempts. Please try again after 15 minutes.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const attempt = recordFailedLogin(rateLimitKey);
      if (attempt.blocked) {
        return NextResponse.json(
          { error: 'Too many failed login attempts. Please try again after 15 minutes.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Success: clear rate limit
    clearLoginRateLimit(rateLimitKey);

    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    await logActivity(user.id, 'Logged in', user.username);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: INACTIVITY_TIMEOUT_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login.' }, { status: 500 });
  }
}
