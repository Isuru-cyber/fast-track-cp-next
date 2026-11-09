import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      invoices: {
        orderBy: { lineNo: 'asc' },
      },
      creator: {
        select: { name: true },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  }

  return NextResponse.json(shipment);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const existing = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  }

  if (user.role === 'ENTRY USER' && existing.createdBy !== user.id) {
    return NextResponse.json({ error: 'You can only edit your own records.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { baseFields, customData, invoices } = body;

    // Validate invoices
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json({ error: 'At least one invoice line is required.' }, { status: 400 });
    }

    const invNos: string[] = [];
    for (const inv of invoices) {
      const invNo = (inv.invoiceNo || '').trim();
      if (!invNo) {
        return NextResponse.json({ error: 'Invoice Number is mandatory for all invoice lines.' }, { status: 400 });
      }
      invNos.push(invNo);
    }

    // Check duplicate invoice numbers within form
    const counts = invNos.reduce((acc: Record<string, number>, num) => {
      acc[num] = (acc[num] || 0) + 1;
      return acc;
    }, {});
    const duplicatesInForm = Object.keys(counts).filter((num) => counts[num] > 1);
    if (duplicatesInForm.length > 0) {
      return NextResponse.json(
        { error: `Duplicate Invoice Numbers entered within the same shipment: ${duplicatesInForm.join(', ')}` },
        { status: 400 }
      );
    }

    // Check duplicate invoice numbers in DB excluding current shipment
    const dbDups = await prisma.shipmentInvoice.findMany({
      where: {
        invoiceNo: { in: invNos },
        shipmentId: { not: shipmentId },
      },
      select: { invoiceNo: true },
    });
    if (dbDups.length > 0) {
      return NextResponse.json(
        {
          error: `Duplicate Entry Detected: These Invoice Numbers already exist in the database: ${dbDups
            .map((d) => d.invoiceNo)
            .join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check BL/AWB duplicates excluding current shipment
    const blAwb = (baseFields.blAwb || '').trim();
    if (blAwb) {
      const dupBl = await prisma.shipment.findFirst({
        where: {
          blAwb: { equals: blAwb, mode: 'insensitive' },
          id: { not: shipmentId },
        },
      });
      if (dupBl) {
        return NextResponse.json(
          { error: 'Duplicate Entry Detected: A shipment with the same BL/AWB already exists.' },
          { status: 400 }
        );
      }
    }

    // Customer match check
    const paymentType = baseFields.paymentType;
    const payRefNo = (baseFields.payRefNo || '').trim();
    const customerName = (baseFields.customerName || '').trim();

    if (paymentType === 'LC' && payRefNo && customerName) {
      const lc = await prisma.letterOfCredit.findUnique({
        where: { lcNo: payRefNo },
        select: { customerName: true },
      });
      if (lc && lc.customerName && lc.customerName.toLowerCase() !== customerName.toLowerCase()) {
        return NextResponse.json(
          { error: `Customer Name does not match the customer registered for this LC (${lc.customerName}).` },
          { status: 400 }
        );
      }
    } else if (paymentType === 'TT' && payRefNo && customerName) {
      const tt = await prisma.telegraphicTransfer.findUnique({
        where: { ttNo: payRefNo },
        select: { customerName: true },
      });
      if (tt && tt.customerName && tt.customerName.toLowerCase() !== customerName.toLowerCase()) {
        return NextResponse.json(
          { error: `Customer Name does not match the customer registered for this TT (${tt.customerName}).` },
          { status: 400 }
        );
      }
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          bookingDate: baseFields.bookingDate ? new Date(baseFields.bookingDate) : undefined,
          customerName: baseFields.customerName || null,
          paymentType: baseFields.paymentType || null,
          payRefNo: baseFields.payRefNo || null,
          packageType: baseFields.packageType || null,
          hsCode: baseFields.hsCode || null,
          shipmentMode: baseFields.shipmentMode || null,
          incoterm: baseFields.incoterm || null,
          cbm: baseFields.cbm ? Number(baseFields.cbm) : null,
          delFrom: baseFields.delFrom || null,
          delTo: baseFields.delTo || null,
          blAwb: baseFields.blAwb || null,
          port: baseFields.port || null,
          cha: baseFields.cha || null,
          cusdc: baseFields.cusdc || null,
          cusdcDate: baseFields.cusdcDate ? new Date(baseFields.cusdcDate) : null,
          forwarderType: baseFields.forwarderType || null,
          forwarder: baseFields.forwarder || null,
          quotationValue: baseFields.quotationValue ? Number(baseFields.quotationValue) : null,
          delStatus: baseFields.delStatus || 'Pending',
          paymentStatus: baseFields.paymentStatus || 'Pending',
          remark: baseFields.remark || null,
          customData: customData || {},
          updatedBy: user.id,
        },
      });

      // Clear existing invoices and recreate
      await tx.shipmentInvoice.deleteMany({
        where: { shipmentId },
      });

      let lineNo = 1;
      for (const inv of invoices) {
        await tx.shipmentInvoice.create({
          data: {
            shipmentId,
            lineNo: lineNo++,
            invoiceNo: inv.invoiceNo.trim(),
            elementsCount: inv.elementsCount ? Number(inv.elementsCount) : null,
            primaryQtyNw: inv.primaryQtyNw ? Number(inv.primaryQtyNw) : null,
            secondaryQtyGw: inv.secondaryQtyGw ? Number(inv.secondaryQtyGw) : null,
            shipmentValue: inv.shipmentValue ? Number(inv.shipmentValue) : null,
            customData: inv.customData || {},
          },
        });
      }
    });

    await logActivity(user.id, 'Updated', existing.refNumber);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Shipment update error:', error);
    return NextResponse.json({ error: error.message || 'Error updating shipment.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  }

  await prisma.shipment.delete({
    where: { id: shipmentId },
  });

  await logActivity(user.id, 'Deleted', shipment.refNumber);

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const existing = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  }

  if (user.role === 'ENTRY USER' && existing.createdBy !== user.id) {
    return NextResponse.json({ error: 'You can only edit your own records.' }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === 'quick_complete' || action === 'complete') {
    // If already delivered / completed, strictly reject quick update
    if (existing.delStatus === 'Delivered' || existing.delStatus === 'Completed') {
      return NextResponse.json(
        { error: 'Shipment is already completed. To change this status, please open the full Edit form.' },
        { status: 400 }
      );
    }

    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        delStatus: 'Delivered',
        updatedBy: user.id,
      },
    });

    await logActivity(user.id, 'Quick Complete', existing.refNumber, existing.delStatus, 'Delivered');

    return NextResponse.json({ success: true, shipment: updated });
  }

  return NextResponse.json({ error: 'Invalid patch action.' }, { status: 400 });
}
