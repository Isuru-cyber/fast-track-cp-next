import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required.' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long and contain both letters and numbers.' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: 'Password successfully changed.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update password.' }, { status: 500 });
  }
}
