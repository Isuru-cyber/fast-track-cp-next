import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Shell from '@/components/layout/Shell';
import ShipmentForm from '@/components/shipments/ShipmentForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ViewShipmentPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      invoices: { orderBy: { lineNo: 'asc' } },
      creator: { select: { name: true } },
    },
  });

  if (!shipment) notFound();

  const fieldConfigs = await prisma.fieldConfig.findMany({
    where: { isActive: true, module: 'SHIPMENT' },
    orderBy: { displayOrder: 'asc' },
  });

  const masterDataList = await prisma.masterData.findMany({
    where: { status: 'Active', module: 'SHIPMENT' },
    orderBy: { value: 'asc' },
  });

  const masterDataMap: Record<string, string[]> = {};
  for (const item of masterDataList) {
    if (!masterDataMap[item.category]) masterDataMap[item.category] = [];
    masterDataMap[item.category].push(item.value);
  }

  return (
    <Shell user={user}>
      <ShipmentForm
        mode="view"
        initialShipment={shipment}
        fieldConfigs={fieldConfigs}
        masterData={masterDataMap}
        nextNo={String(shipment.no || 1).padStart(4, '0')}
        userName={user.name}
        isAdmin={user.role === 'ADMIN'}
      />
    </Shell>
  );
}
