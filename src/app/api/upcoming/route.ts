import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const upcoming = await prisma.upcomingShipment.findMany({
    where: { status: 'Pending' },
    orderBy: { estimateDate: 'asc' },
  });

  return NextResponse.json(upcoming);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { estimateDate, customerName, shipmentMode, containerType, approxQty, cbm, remarks, customData } = await req.json();

    if (!estimateDate) {
      return NextResponse.json({ error: 'Estimate Date is required.' }, { status: 400 });
    }

    const item = await prisma.upcomingShipment.create({
      data: {
        estimateDate: new Date(estimateDate),
        customerName: customerName ? customerName.trim() : null,
        shipmentMode: shipmentMode ? shipmentMode.trim() : null,
        containerType: containerType ? containerType.trim() : null,
        approxQty: approxQty ? Number(approxQty) : null,
        cbm: cbm ? Number(cbm) : null,
        remarks: remarks ? remarks.trim() : null,
        status: 'Pending',
        customData: customData || {},
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create upcoming shipment.' }, { status: 500 });
  }
}
