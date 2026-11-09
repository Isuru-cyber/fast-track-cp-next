import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'fast_track_session';
export const INACTIVITY_TIMEOUT_SECONDS = 1800; // 30 minutes

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production.');
}
const SECRET_KEY = new TextEncoder().encode(
  jwtSecret || 'dev-only-insecure-secret-key-please-set-jwt-secret-in-env'
);

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'ENTRY USER' | 'VIEW';
  lastActivity: number;
}

export async function createSessionToken(user: { id: number; username: string; name: string; role: string }): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    lastActivity: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const lastActivity = Number(payload.lastActivity || 0);
    // Check 30 minutes inactivity timeout
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT_SECONDS * 1000) {
      return null;
    }
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
