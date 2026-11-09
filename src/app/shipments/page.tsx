import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import RecordsTable from '@/components/shipments/RecordsTable';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Props {
  searchParams: Promise<{
    search?: string;
    date_filter?: string;
    start_date?: string;
    end_date?: string;
    del_status?: string;
  }>;
}

function safeParseDate(d: any) {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default async function ShipmentsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resolvedParams = (await searchParams) || {};
  const search = resolvedParams.search || '';
  const dateFilter = resolvedParams.date_filter || 'month';
  const startDate = resolvedParams.start_date || '';
  const endDate = resolvedParams.end_date || '';
  const delStatus = resolvedParams.del_status || '';

  const now = new Date();
  let dateCondition: any = undefined;

  if (dateFilter === 'week') {
    const monday = new Date();
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    dateCondition = { gte: monday };
  } else if (dateFilter === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilter === 'year') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilter === 'range' && startDate && endDate) {
    const start = safeParseDate(startDate);
    const end = safeParseDate(endDate);
    if (start && end) {
      end.setHours(23, 59, 59, 999);
      dateCondition = { gte: start, lte: end };
    }
  }

  const where: any = {};
  if (dateCondition) where.bookingDate = dateCondition;

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { refNumber: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
      { blAwb: { contains: term, mode: 'insensitive' } },
      { invoices: { some: { invoiceNo: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  if (delStatus && delStatus !== 'all' && delStatus !== 'All') {
    where.delStatus = delStatus;
  }

  let shipments: any[] = [];
  let fieldConfigs: any[] = [];
  let deliveryStatusOptions: string[] = ['Pending', 'Delivered'];

  try {
    const results = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          invoices: { orderBy: { lineNo: 'asc' } },
          creator: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getCachedFieldConfigs('SHIPMENT'),
      prisma.masterData.findMany({
        where: { category: 'DELIVERY_STATUS', status: 'Active' },
        orderBy: { value: 'asc' },
        select: { value: true },
      }),
    ]);
    shipments = results[0];
    fieldConfigs = results[1] || [];
    const dbOptions = (results[2] || []).map((m: any) => m.value);
    deliveryStatusOptions = Array.from(new Set(['Pending', 'Delivered', ...dbOptions]));
  } catch (err) {
    console.error('Shipments page data fetch error:', err);
  }

  return (
    <Shell user={user}>
      <RecordsTable
        initialShipments={shipments}
        fieldConfigs={fieldConfigs}
        deliveryStatusOptions={deliveryStatusOptions}
        currentUser={user}
        filters={{
          search,
          dateFilter,
          startDate,
          endDate,
          delStatus,
        }}
      />
    </Shell>
  );
}
