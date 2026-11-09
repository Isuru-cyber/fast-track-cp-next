import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ttId = parseInt(id, 10);
  if (isNaN(ttId)) {
    return NextResponse.json({ error: 'Invalid TT ID.' }, { status: 400 });
  }

  const tt = await prisma.telegraphicTransfer.findUnique({
    where: { id: ttId },
  });

  if (!tt) return NextResponse.json({ error: 'TT not found' }, { status: 404 });

  const shipments = await prisma.shipment.findMany({
    where: {
      paymentType: 'TT',
      payRefNo: tt.ttNo,
      statusFlag: 'Active',
    },
    include: {
      invoices: true,
    },
    orderBy: { bookingDate: 'desc' },
  });

  return NextResponse.json({ tt, shipments });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const ttId = parseInt(id, 10);
  if (isNaN(ttId)) {
    return NextResponse.json({ error: 'Invalid TT ID.' }, { status: 400 });
  }

  try {
    const { customer_name, bank_name, proforma_invoice, original_value, issue_date, expiry_date, status, notes } =
      await req.json();

    const updated = await prisma.telegraphicTransfer.update({
      where: { id: ttId },
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

    return NextResponse.json({ success: true, tt: updated });
  } catch (error: any) {
    console.error('Update TT error:', error);
    return NextResponse.json({ error: 'Failed to update TT. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const ttId = parseInt(id, 10);
  if (isNaN(ttId)) {
    return NextResponse.json({ error: 'Invalid TT ID.' }, { status: 400 });
  }

  try {
    await prisma.telegraphicTransfer.delete({
      where: { id: ttId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete TT error:', error);
    return NextResponse.json({ error: 'Failed to delete TT. Please try again.' }, { status: 500 });
  }
}
