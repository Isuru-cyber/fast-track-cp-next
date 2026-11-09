import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedMasterData } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import PaymentOptManager from '@/components/payment-options/PaymentOptManager';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Props {
  searchParams: Promise<{
    search?: string;
    status_filter?: string;
  }>;
}

export default async function TtPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  const resolved = (await searchParams) || {};
  const search = resolved.search || '';
  const statusFilter = resolved.status_filter || 'Active';

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

  let tts: any[] = [];
  let customerList: any[] = [];
  let ttShipments: any[] = [];

  try {
    const results = await Promise.all([
      prisma.telegraphicTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      getCachedMasterData({ categories: ['CUSTOMER_NAME'], status: 'Active', module: 'LC' }),
      prisma.shipment.findMany({
        where: {
          paymentType: 'TT',
          statusFlag: 'Active',
        },
        select: {
          payRefNo: true,
          invoices: { select: { shipmentValue: true } },
        },
      }),
    ]);

    tts = results[0];
    customerList = results[1] || [];
    ttShipments = results[2];
  } catch (err) {
    console.error('Error fetching TT data:', err);
  }

  // Precompute utilized amounts in-memory in O(N)
  const usedAmountMap = new Map<string, number>();
  for (const s of ttShipments) {
    const key = (s.payRefNo || '').trim().toUpperCase();
    if (!key) continue;
    let sVal = 0;
    for (const inv of s.invoices || []) {
      sVal += Number(inv.shipmentValue || 0);
    }
    usedAmountMap.set(key, (usedAmountMap.get(key) || 0) + sVal);
  }

  const items = tts.map((tt) => {
    const key = (tt.ttNo || '').trim().toUpperCase();
    const usedAmount = usedAmountMap.get(key) || 0;
    const origVal = Number(tt.originalValue);
    const balance = origVal - usedAmount;

    let displayStatus = tt.status;
    if (tt.status === 'Active' && tt.expiryDate && new Date(tt.expiryDate) < today) {
      displayStatus = 'Expired';
    }

    return {
      id: tt.id,
      tt_no: tt.ttNo,
      customer_name: tt.customerName || undefined,
      bank_name: tt.bankName || undefined,
      proforma_invoice: tt.proformaInvoice || undefined,
      original_value: origVal,
      issue_date: tt.issueDate?.toISOString(),
      expiry_date: tt.expiryDate?.toISOString(),
      status: displayStatus,
      notes: tt.notes || undefined,
      used_amount: usedAmount,
      balance,
    };
  });

  return (
    <Shell user={user}>
      <PaymentOptManager
        type="TT"
        initialItems={items}
        customers={customerList.map((c: any) => c.value)}
        isAdmin={user.role === 'ADMIN'}
        search={search}
        statusFilter={statusFilter}
      />
    </Shell>
  );
}
