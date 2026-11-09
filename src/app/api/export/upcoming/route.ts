import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCsvCell } from '@/lib/ref-generator';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized. Export is restricted for view-only users.' }, { status: 403 });
  }

  const upcoming = await prisma.upcomingShipment.findMany({
    where: { status: 'Pending' },
    orderBy: { estimateDate: 'asc' },
  });

  const headers = ['Estimate Date', 'Customer Name', 'Shipment Mode', 'Container Type', 'Approx Qty', 'CBM', 'Remarks', 'Status'];
  const csvRows: string[] = [headers.map(formatCsvCell).join(',')];

  for (const u of upcoming) {
    const dStr = u.estimateDate.toISOString().split('T')[0];
    const cName = u.customerName || '';
    const mode = u.shipmentMode || '';
    const cType = u.containerType || '';
    const qty = u.approxQty ? Number(u.approxQty).toFixed(2) : '';
    const cbm = u.cbm ? Number(u.cbm).toFixed(2) : '';
    const rem = u.remarks || '';
    const st = u.status;

    csvRows.push([
      formatCsvCell(dStr),
      formatCsvCell(cName),
      formatCsvCell(mode),
      formatCsvCell(cType),
      formatCsvCell(qty),
      formatCsvCell(cbm),
      formatCsvCell(rem),
      formatCsvCell(st),
    ].join(','));
  }

  return new NextResponse(csvRows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="upcoming_shipments_${Date.now()}.csv"`,
    },
  });
}
