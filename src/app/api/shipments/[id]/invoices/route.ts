import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const shipmentId = parseInt(id, 10);
  if (isNaN(shipmentId)) {
    return NextResponse.json({ error: 'Invalid shipment ID.' }, { status: 400 });
  }

  try {
    const invoices = await prisma.shipmentInvoice.findMany({
      where: { shipmentId },
      orderBy: { lineNo: 'asc' },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error('Fetch shipment invoices error:', error);
    return NextResponse.json({ error: 'Failed to load shipment invoices.' }, { status: 500 });
  }
}
