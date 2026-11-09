import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCsvCell } from '@/lib/ref-generator';

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
      name: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['ID', 'Name', 'Username', 'Role', 'Status', 'Created At'];
  const rows = users.map((u) => [
    formatCsvCell(u.id),
    formatCsvCell(u.name),
    formatCsvCell(u.username),
    formatCsvCell(u.role),
    formatCsvCell(u.status),
    formatCsvCell(u.createdAt.toISOString().replace('T', ' ').substring(0, 19)),
  ]);

  const csvContent = [headers.map(formatCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=users_export_${timestamp}.csv`,
    },
  });
}
