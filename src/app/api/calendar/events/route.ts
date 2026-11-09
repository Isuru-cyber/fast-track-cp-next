import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  const dateFilter: any = {};
  if (startStr) dateFilter.gte = new Date(startStr);
  if (endStr) dateFilter.lte = new Date(endStr);

  // Fetch actual shipments
  const shipments = await prisma.shipment.findMany({
    where: Object.keys(dateFilter).length ? { bookingDate: dateFilter } : undefined,
    select: {
      id: true,
      refNumber: true,
      customerName: true,
      bookingDate: true,
    },
  });

  // Fetch upcoming shipments
  const upcoming = await prisma.upcomingShipment.findMany({
    where: Object.keys(dateFilter).length ? { estimateDate: dateFilter } : undefined,
    select: {
      id: true,
      customerName: true,
      estimateDate: true,
    },
  });

  const events = [
    ...shipments.map((s) => ({
      id: `shipment_${s.id}`,
      title: `${s.refNumber || ''} - ${s.customerName || 'Unknown'}`,
      start: s.bookingDate.toISOString().split('T')[0],
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      extendedProps: { type: 'actual', id: s.id },
    })),
    ...upcoming.map((u) => ({
      id: `upcoming_${u.id}`,
      title: `[Planned] ${u.customerName || 'Unknown'}`,
      start: u.estimateDate.toISOString().split('T')[0],
      backgroundColor: '#f97316',
      borderColor: '#f97316',
      extendedProps: { type: 'planned', id: u.id },
    })),
  ];

  return NextResponse.json(events);
}
