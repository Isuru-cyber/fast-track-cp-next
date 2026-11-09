import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCsvCell } from '@/lib/ref-generator';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 401 });

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
  if (actionFilter) where.action = actionFilter;
  if (dateFilter) {
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);
    where.timestamp = { gte: startOfDay, lte: endOfDay };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { timestamp: 'desc' },
  });

  const headers = ['Timestamp', 'User', 'Action', 'Record'];
  const csvRows: string[] = [headers.map(formatCsvCell).join(',')];
  for (const l of logs) {
    const ts = l.timestamp.toISOString().replace('T', ' ').slice(0, 19);
    csvRows.push([
      formatCsvCell(ts),
      formatCsvCell(l.user?.name || 'System'),
      formatCsvCell(l.action),
      formatCsvCell(l.recordId || ''),
    ].join(','));
  }

  return new NextResponse(csvRows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="activity_logs_${Date.now()}.csv"`,
    },
  });
}
