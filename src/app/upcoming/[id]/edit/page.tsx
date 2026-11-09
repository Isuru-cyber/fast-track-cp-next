import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import UpcomingForm from '@/components/upcoming/UpcomingForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditUpcomingPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  const { id } = await params;
  const recordId = parseInt(id, 10);

  const [fieldConfigs, record, masterDataList] = await Promise.all([
    getCachedFieldConfigs('UPCOMING'),
    prisma.upcomingShipment.findUnique({
      where: { id: recordId },
    }),
    prisma.masterData.findMany({
      where: { status: 'Active', module: 'UPCOMING' },
      orderBy: { value: 'asc' },
    }),
  ]);

  if (!record) notFound();

  const masterDataMap: Record<string, string[]> = {};
  for (const item of masterDataList) {
    if (!masterDataMap[item.category]) masterDataMap[item.category] = [];
    masterDataMap[item.category].push(item.value);
  }

  return (
    <Shell user={user}>
      <UpcomingForm
        initialRecord={record}
        fieldConfigs={fieldConfigs}
        masterDataMap={masterDataMap}
        customers={masterDataMap['CUSTOMER_NAME'] || []}
        shipmentModes={masterDataMap['SHIPMENT_MODE'] || []}
        containerTypes={masterDataMap['CONTAINER_TYPE'] || []}
      />
    </Shell>
  );
}
