import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCsvCell } from '@/lib/ref-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status_filter') || '';

  const and: any[] = [];
  if (search.trim()) {
    const term = search.trim();
    and.push({
      OR: [
        { ttNo: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { bankName: { contains: term, mode: 'insensitive' } },
        { proformaInvoice: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (statusFilter === 'Expired') {
    and.push({ status: 'Active', expiryDate: { lt: today } });
  } else if (statusFilter === 'Active') {
    and.push({
      status: 'Active',
      OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
    });
  } else if (statusFilter && statusFilter !== 'all') {
    and.push({ status: statusFilter });
  }

  const whereClause: any = and.length > 0 ? { AND: and } : {};

  const [tts, ttShipments] = await Promise.all([
    prisma.telegraphicTransfer.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shipment.findMany({
      where: {
        paymentType: 'TT',
        statusFlag: 'Active',
      },
      select: {
        payRefNo: true,
        invoices: { select: { shipmentValue: true } },
      },
    }),
  ]);

  const usedAmountMap = new Map<string, number>();
  for (const s of ttShipments) {
    const key = (s.payRefNo || '').trim().toUpperCase();
    if (!key) continue;
    let sVal = 0;
    for (const inv of s.invoices || []) {
      sVal += Number(inv.shipmentValue || 0);
    }
    usedAmountMap.set(key, (usedAmountMap.get(key) || 0) + sVal);
  }

  const headers = [
    'TT Number',
    'Customer Name',
    'Bank Name',
    'Proforma Invoice',
    'Original Value (USD)',
    'Used Amount (USD)',
    'Remaining Balance (USD)',
    'Issue Date',
    'Expiry Date',
    'Status',
    'Notes',
    'Created At',
  ];

  const rows: string[][] = tts.map((tt) => {
    const key = (tt.ttNo || '').trim().toUpperCase();
    const usedAmount = usedAmountMap.get(key) || 0;
    const origVal = Number(tt.originalValue || 0);
    const balance = Math.max(0, origVal - usedAmount);

    return [
      tt.ttNo,
      tt.customerName || '',
      tt.bankName || '',
      tt.proformaInvoice || '',
      origVal.toFixed(2),
      usedAmount.toFixed(2),
      balance.toFixed(2),
      tt.issueDate ? new Date(tt.issueDate).toISOString().split('T')[0] : '',
      tt.expiryDate ? new Date(tt.expiryDate).toISOString().split('T')[0] : '',
      tt.status,
      tt.notes || '',
      new Date(tt.createdAt).toISOString().replace('T', ' ').slice(0, 19),
    ];
  });

  const csvContent = [
    headers.map(formatCsvCell).join(','),
    ...rows.map((r) => r.map(formatCsvCell).join(',')),
  ].join('\r\n');

  const filename = `TT_Report_${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
