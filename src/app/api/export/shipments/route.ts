import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCsvCell } from '@/lib/ref-generator';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized. Export is restricted for view-only users.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const dateFilter = searchParams.get('date_filter') || 'month';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const exportMode = searchParams.get('export_mode') || 'summary';
  const delStatus = searchParams.get('del_status') || '';

  // Active fields
  const fieldConfigs = await prisma.fieldConfig.findMany({
    where: { isActive: true, module: 'SHIPMENT' },
    orderBy: { displayOrder: 'asc' },
  });

  const now = new Date();
  let dateCondition: any = undefined;

  if (dateFilter === 'week') {
    const monday = new Date();
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    dateCondition = { gte: monday };
  } else if (dateFilter === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilter === 'year') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilter === 'range' && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateCondition = { gte: start, lte: end };
  }

  const where: any = {};
  if (dateCondition) where.bookingDate = dateCondition;

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { refNumber: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
      { blAwb: { contains: term, mode: 'insensitive' } },
      { invoices: { some: { invoiceNo: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  if (delStatus && delStatus !== 'all' && delStatus !== 'All') {
    where.delStatus = delStatus;
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      invoices: { orderBy: { lineNo: 'asc' } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // CSV Generation
  const csvRows: string[] = [];

  // Header row
  const headers = fieldConfigs.map((f) => formatCsvCell(f.label));
  csvRows.push(headers.join(','));

  const formatVal = (v: any, type: string) => {
    if (v === null || v === undefined) return '';
    if (type === 'Date' && v) {
      return new Date(v).toISOString().split('T')[0];
    }
    if ((type === 'Decimal' || type === 'Currency' || type === 'Number') && v !== '') {
      return Number(v).toFixed(2);
    }
    return String(v);
  };

  if (exportMode === 'summary') {
    for (const s of shipments) {
      const cd = (s.customData as any) || {};
      const invs = s.invoices;

      const rowValues = fieldConfigs.map((f) => {
        if (f.fieldScope === 'LINE') {
          const isNumeric = ['Number', 'Decimal', 'Currency'].includes(f.type);
          const vals: any[] = [];

          for (const inv of invs) {
            let iv = '';
            if (f.isCustom) {
              const icd = (inv.customData as any) || {};
              iv = icd[f.fieldKey];
            } else {
              iv = (inv as any)[f.fieldKey];
            }
            if (iv !== null && iv !== undefined && iv !== '') {
              vals.push(iv);
            }
          }

          if (isNumeric) {
            const sum = vals.reduce((a, b) => a + Number(b), 0);
            return formatCsvCell(sum.toFixed(2));
          } else {
            return formatCsvCell(vals.join(', '));
          }
        } else {
          let v = '';
          if (f.isCustom) {
            v = cd[f.fieldKey] || '';
          } else if (f.fieldKey === 'createdByName') {
            v = s.creator?.name || s.userName || '';
          } else if (f.fieldKey === 'no' && s.no) {
            v = String(s.no).padStart(4, '0');
          } else {
            v = (s as any)[f.fieldKey] ?? '';
          }
          return formatCsvCell(formatVal(v, f.type));
        }
      });

      csvRows.push(rowValues.join(','));
    }
  } else {
    // Detailed Export (One row per invoice line)
    for (const s of shipments) {
      const cd = (s.customData as any) || {};
      const invs = s.invoices.length > 0 ? s.invoices : [null];

      for (const inv of invs) {
        const icd = inv ? ((inv.customData as any) || {}) : {};

        const rowValues = fieldConfigs.map((f) => {
          if (f.fieldScope === 'LINE') {
            if (!inv) return formatCsvCell('');
            const v = f.isCustom ? icd[f.fieldKey] : (inv as any)[f.fieldKey];
            return formatCsvCell(formatVal(v, f.type));
          } else {
            let v = '';
            if (f.isCustom) {
              v = cd[f.fieldKey] || '';
            } else if (f.fieldKey === 'createdByName') {
              v = s.creator?.name || s.userName || '';
            } else if (f.fieldKey === 'no' && s.no) {
              v = String(s.no).padStart(4, '0');
            } else {
              v = (s as any)[f.fieldKey] ?? '';
            }
            return formatCsvCell(formatVal(v, f.type));
          }
        });

        csvRows.push(rowValues.join(','));
      }
    }
  }

  const csvContent = csvRows.join('\r\n');
  const dStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="shipments_${exportMode}_${dStr}.csv"`,
    },
  });
}
