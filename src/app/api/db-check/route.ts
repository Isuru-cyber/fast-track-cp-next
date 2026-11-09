import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const envCheck = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    databaseUrlHost: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] : null,
  };

  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: 'ok',
      envCheck,
      userCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        envCheck,
        errorName: err.name,
        errorMessage: err.message,
      },
      { status: 500 }
    );
  }
}
