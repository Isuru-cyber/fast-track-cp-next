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
        { lcNo: { contains: term, mode: 'insensitive' } },
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

  const lcs = await prisma.letterOfCredit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const lcNos = lcs.map((lc) => lc.lcNo).filter(Boolean);

  // Batch query all matching shipments to eliminate N+1 queries
  const shipments = lcNos.length > 0
    ? await prisma.shipment.findMany({
        where: {
          paymentType: 'LC',
          payRefNo: { in: lcNos },
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

  const result = lcs.map((lc) => {
    const usedAmount = usedMap.get(lc.lcNo) || 0;
    const origVal = Number(lc.originalValue);
    const balance = origVal - usedAmount;

    let displayStatus = lc.status;
    if (lc.status === 'Active' && lc.expiryDate && new Date(lc.expiryDate) < today) {
      displayStatus = 'Expired';
    }

    return {
      id: lc.id,
      lc_no: lc.lcNo,
      customer_name: lc.customerName,
      bank_name: lc.bankName,
      proforma_invoice: lc.proformaInvoice,
      original_value: origVal,
      issue_date: lc.issueDate,
      expiry_date: lc.expiryDate,
      status: displayStatus,
      notes: lc.notes,
      used_amount: usedAmount,
      balance: balance,
      created_at: lc.createdAt,
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
    const { lc_no, customer_name, bank_name, proforma_invoice, original_value, issue_date, expiry_date, status, notes } =
      await req.json();

    if (!lc_no || !original_value) {
      return NextResponse.json({ error: 'LC No and Original Value are required.' }, { status: 400 });
    }

    const existing = await prisma.letterOfCredit.findUnique({
      where: { lcNo: lc_no.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'An LC with this number already exists.' }, { status: 400 });
    }

    const lc = await prisma.letterOfCredit.create({
      data: {
        lcNo: lc_no.trim(),
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

    return NextResponse.json({ success: true, lc });
  } catch (error: any) {
    console.error('Create LC error:', error);
    return NextResponse.json({ error: 'Failed to create LC. Please check your input and try again.' }, { status: 500 });
  }
}
