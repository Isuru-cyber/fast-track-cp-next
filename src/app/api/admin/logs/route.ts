import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const actionFilter = searchParams.get('action_filter') || '';
  const dateFilter = searchParams.get('date_filter') || '';

  const where: any = {};

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { recordId: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (actionFilter) {
    where.action = actionFilter;
  }

  if (dateFilter) {
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);
    where.timestamp = { gte: startOfDay, lte: endOfDay };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: { name: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const actions = await prisma.activityLog.findMany({
    distinct: ['action'],
    select: { action: true },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      userName: l.user?.name || 'System',
      action: l.action,
      record_id: l.recordId,
    })),
    uniqueActions: actions.map((a) => a.action),
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  await prisma.activityLog.deleteMany({});
  return NextResponse.json({ success: true });
}
