import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const lcId = parseInt(id, 10);
  if (isNaN(lcId)) {
    return NextResponse.json({ error: 'Invalid LC ID.' }, { status: 400 });
  }

  const lc = await prisma.letterOfCredit.findUnique({
    where: { id: lcId },
  });

  if (!lc) return NextResponse.json({ error: 'LC not found' }, { status: 404 });

  // Get linked shipments and their invoice details
  const shipments = await prisma.shipment.findMany({
    where: {
      paymentType: 'LC',
      payRefNo: lc.lcNo,
      statusFlag: 'Active',
    },
    include: {
      invoices: true,
    },
    orderBy: { bookingDate: 'desc' },
  });

  return NextResponse.json({ lc, shipments });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const lcId = parseInt(id, 10);
  if (isNaN(lcId)) {
    return NextResponse.json({ error: 'Invalid LC ID.' }, { status: 400 });
  }

  try {
    const { customer_name, bank_name, proforma_invoice, original_value, issue_date, expiry_date, status, notes } =
      await req.json();

    const updated = await prisma.letterOfCredit.update({
      where: { id: lcId },
      data: {
        customerName: customer_name ? customer_name.trim() : null,
        bankName: bank_name ? bank_name.trim() : null,
        proformaInvoice: proforma_invoice ? proforma_invoice.trim() : null,
        originalValue: Number(original_value),
        issueDate: issue_date ? new Date(issue_date) : null,
        expiryDate: expiry_date ? new Date(expiry_date) : null,
        status: status || 'Active',
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, lc: updated });
  } catch (error: any) {
    console.error('Update LC error:', error);
    return NextResponse.json({ error: 'Failed to update LC. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const lcId = parseInt(id, 10);
  if (isNaN(lcId)) {
    return NextResponse.json({ error: 'Invalid LC ID.' }, { status: 400 });
  }

  try {
    await prisma.letterOfCredit.delete({
      where: { id: lcId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete LC error:', error);
    return NextResponse.json({ error: 'Failed to delete LC. Please try again.' }, { status: 500 });
  }
}
