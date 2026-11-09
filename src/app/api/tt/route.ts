import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const where: any = and.length > 0 ? { AND: and } : {};

  const tts = await prisma.telegraphicTransfer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const ttNos = tts.map((tt) => tt.ttNo).filter(Boolean);

  // Batch query all matching shipments to eliminate N+1 queries
  const shipments = ttNos.length > 0
    ? await prisma.shipment.findMany({
        where: {
          paymentType: 'TT',
          payRefNo: { in: ttNos },
          statusFlag: 'Active',
        },
        select: {
          payRefNo: true,
          invoices: {
            select: { shipmentValue: true },
          },
        },
      })
    : [];

  const usedMap = new Map<string, number>();
  for (const s of shipments) {
    if (!s.payRefNo) continue;
    let sum = usedMap.get(s.payRefNo) || 0;
    for (const inv of s.invoices) {
      sum += Number(inv.shipmentValue || 0);
    }
    usedMap.set(s.payRefNo, sum);
  }

  const result = tts.map((tt) => {
    const usedAmount = usedMap.get(tt.ttNo) || 0;
    const origVal = Number(tt.originalValue);
    const balance = origVal - usedAmount;

    let displayStatus = tt.status;
    if (tt.status === 'Active' && tt.expiryDate && new Date(tt.expiryDate) < today) {
      displayStatus = 'Expired';
    }

    return {
      id: tt.id,
      tt_no: tt.ttNo,
      customer_name: tt.customerName,
      bank_name: tt.bankName,
      proforma_invoice: tt.proformaInvoice,
      original_value: origVal,
      issue_date: tt.issueDate,
      expiry_date: tt.expiryDate,
      status: displayStatus,
      notes: tt.notes,
      used_amount: usedAmount,
      balance: balance,
      created_at: tt.createdAt,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const { tt_no, customer_name, bank_name, proforma_invoice, original_value, issue_date, expiry_date, status, notes } =
      await req.json();

    if (!tt_no || !original_value) {
      return NextResponse.json({ error: 'TT No and Original Value are required.' }, { status: 400 });
    }

    const existing = await prisma.telegraphicTransfer.findUnique({
      where: { ttNo: tt_no.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'A TT with this number already exists.' }, { status: 400 });
    }

    const tt = await prisma.telegraphicTransfer.create({
      data: {
        ttNo: tt_no.trim(),
        customerName: customer_name ? customer_name.trim() : null,
        bankName: bank_name ? bank_name.trim() : null,
        proformaInvoice: proforma_invoice ? proforma_invoice.trim() : null,
        originalValue: Number(original_value),
        issueDate: issue_date ? new Date(issue_date) : null,
        expiryDate: expiry_date ? new Date(expiry_date) : null,
        status: status || 'Active',
        notes: notes || null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, tt });
  } catch (error: any) {
    console.error('Create TT error:', error);
    return NextResponse.json({ error: 'Failed to create TT. Please check your input and try again.' }, { status: 500 });
  }
}
