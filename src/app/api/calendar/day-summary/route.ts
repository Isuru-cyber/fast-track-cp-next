import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'Date is required.' }, { status: 400 });
  }

  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch actual shipments on that date
  const shipments = await prisma.shipment.findMany({
    where: {
      bookingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      invoices: true,
    },
  });

  let totShipQty = 0;
  let totShipCbm = 0;
  const shipList = shipments.map((s) => {
    let sQty = 0;
    for (const inv of s.invoices) {
      sQty += Number(inv.secondaryQtyGw || 0);
    }
    const cbmVal = Number(s.cbm || 0);
    totShipQty += sQty;
    totShipCbm += cbmVal;

    return {
      id: s.id,
      refNumber: s.refNumber,
      customerName: s.customerName,
      qty: sQty,
      cbm: cbmVal,
      delStatus: s.delStatus,
    };
  });

  // Fetch planned shipments on that date
  const upcoming = await prisma.upcomingShipment.findMany({
    where: {
      estimateDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  let totUpcQty = 0;
  let totUpcCbm = 0;
  const upcList = upcoming.map((u) => {
    const qtyVal = Number(u.approxQty || 0);
    const cbmVal = Number(u.cbm || 0);
    totUpcQty += qtyVal;
    totUpcCbm += cbmVal;

    return {
      id: u.id,
      customerName: u.customerName,
      shipmentMode: u.shipmentMode,
      containerType: u.containerType,
      qty: qtyVal,
      cbm: cbmVal,
      status: u.status,
    };
  });

  return NextResponse.json({
    date: dateStr,
    actual: {
      count: shipments.length,
      qty: totShipQty,
      cbm: totShipCbm,
      items: shipList,
    },
    planned: {
      count: upcoming.length,
      qty: totUpcQty,
      cbm: totUpcCbm,
      items: upcList,
    },
  });
}
