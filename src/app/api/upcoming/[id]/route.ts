import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const itemId = parseInt(id, 10);

  const item = await prisma.upcomingShipment.findUnique({
    where: { id: itemId },
  });

  if (!item) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);

  try {
    const { action, estimateDate, customerName, shipmentMode, containerType, approxQty, cbm, remarks, status, customData } =
      await req.json();

    if (action === 'complete') {
      const updated = await prisma.upcomingShipment.update({
        where: { id: itemId },
        data: { status: 'Completed' },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    const updated = await prisma.upcomingShipment.update({
      where: { id: itemId },
      data: {
        estimateDate: estimateDate ? new Date(estimateDate) : undefined,
        customerName: customerName ? customerName.trim() : null,
        shipmentMode: shipmentMode ? shipmentMode.trim() : null,
        containerType: containerType ? containerType.trim() : null,
        approxQty: approxQty ? Number(approxQty) : null,
        cbm: cbm ? Number(cbm) : null,
        remarks: remarks ? remarks.trim() : null,
        status: status || 'Pending',
        customData: customData !== undefined ? customData : undefined,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update record.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);

  try {
    await prisma.upcomingShipment.delete({
      where: { id: itemId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete record.' }, { status: 500 });
  }
}
