import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import UpcomingForm from '@/components/upcoming/UpcomingForm';

export default async function NewUpcomingPage() {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  const [fieldConfigs, masterDataList] = await Promise.all([
    getCachedFieldConfigs('UPCOMING'),
    prisma.masterData.findMany({
      where: { status: 'Active', module: 'UPCOMING' },
      orderBy: { value: 'asc' },
    }),
  ]);

  const masterDataMap: Record<string, string[]> = {};
  for (const item of masterDataList) {
    if (!masterDataMap[item.category]) masterDataMap[item.category] = [];
    masterDataMap[item.category].push(item.value);
  }

  return (
    <Shell user={user}>
      <UpcomingForm
        fieldConfigs={fieldConfigs}
        masterDataMap={masterDataMap}
        customers={masterDataMap['CUSTOMER_NAME'] || []}
        shipmentModes={masterDataMap['SHIPMENT_MODE'] || []}
        containerTypes={masterDataMap['CONTAINER_TYPE'] || []}
      />
    </Shell>
  );
}
