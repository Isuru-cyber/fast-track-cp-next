import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role_filter') || '';
  const statusFilter = searchParams.get('status_filter') || '';

  const where: any = {};

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { username: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (roleFilter) where.role = roleFilter;
  if (statusFilter) where.status = statusFilter;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
      const { username, name, role, status, password } = body;

      if (!username || !username.trim()) {
        return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
      }

      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({
        where: { username: username.trim() },
      });
      if (existing) {
        return NextResponse.json({ error: 'Username already exists.' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);

      const created = await prisma.user.create({
        data: {
          username: username.trim(),
          name: name ? name.trim() : username.trim(),
          role: role || 'VIEW',
          status: status || 'Active',
          passwordHash,
        },
      });

      return NextResponse.json({ success: true, user: created });
    }

    if (action === 'edit') {
      const { id, name, role, status, password } = body;
      const targetId = Number(id);

      // Self-lockout check
      if (targetId === user.id) {
        if (status !== 'Active') {
          return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
        }
        if (role !== 'ADMIN') {
          return NextResponse.json({ error: 'You cannot remove Admin role from your own account.' }, { status: 400 });
        }
      }

      // Last remaining admin check
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (targetUser && targetUser.role === 'ADMIN' && (role !== 'ADMIN' || status !== 'Active')) {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN', status: 'Active' },
        });
        if (adminCount <= 1) {
          return NextResponse.json({ error: 'Cannot deactivate or demote the only remaining Administrator.' }, { status: 400 });
        }
      }

      const updateData: any = {
        name: name ? name.trim() : '',
        role,
        status,
      };

      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
        }
        updateData.passwordHash = await hashPassword(password.trim());
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: updateData,
      });

      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'delete') {
      const { id } = body;
      const targetId = Number(id);

      if (targetId === user.id) {
        return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (targetUser && targetUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN', status: 'Active' },
        });
        if (adminCount <= 1) {
          return NextResponse.json({ error: 'Cannot delete the only remaining Administrator.' }, { status: 400 });
        }
      }

      try {
        await prisma.user.delete({ where: { id: targetId } });
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json(
          { error: 'Cannot delete user because they have recorded shipments or audit logs. Set their status to Inactive instead.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('User management error:', error);
    return NextResponse.json({ error: 'An error occurred during the user management operation.' }, { status: 500 });
  }
}
