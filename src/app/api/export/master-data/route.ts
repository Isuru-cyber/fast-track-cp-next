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
  const category = searchParams.get('category') || '';
  const moduleFilter = searchParams.get('module') || '';

  const where: any = {};
  if (category) {
    where.category = category;
  }
  if (moduleFilter) {
    where.module = moduleFilter;
  }

  const items = await prisma.masterData.findMany({
    where,
    orderBy: [{ category: 'asc' }, { value: 'asc' }],
  });

  const headers = ['ID', 'Category', 'Value / Name', 'Module', 'Status', 'Created At'];
  const rows = items.map((item) => [
    formatCsvCell(item.id),
    formatCsvCell(item.category),
    formatCsvCell(item.value),
    formatCsvCell(item.module),
    formatCsvCell(item.status),
    formatCsvCell(item.createdAt.toISOString().replace('T', ' ').substring(0, 19)),
  ]);

  const csvContent = [
    headers.map(formatCsvCell).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);
  const filename = category ? `master_data_${category.toLowerCase()}_${timestamp}.csv` : `master_data_catalog_${timestamp}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
