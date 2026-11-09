interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// Global in-memory store for login attempts
const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of stale records
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.blockedUntil && record.blockedUntil < now) {
        rateLimitStore.delete(key);
      } else if (now - record.lastAttempt > WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

export function checkLoginRateLimit(key: string): { blocked: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record) return { blocked: false };

  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  // Reset if window has elapsed and block expired
  if (now - record.firstAttempt > WINDOW_MS) {
    rateLimitStore.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
}

export function recordFailedLogin(key: string): { blocked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { blocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - 1 };
  }

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    return { blocked: true, attemptsLeft: 0 };
  }

  return { blocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - record.count };
}

export function clearLoginRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
