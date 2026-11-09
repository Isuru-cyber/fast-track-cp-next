import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs, getCachedMasterData } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import ShipmentForm from '@/components/shipments/ShipmentForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditShipmentPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  const { id } = await params;
  const shipmentId = parseInt(id, 10);

  const [shipment, fieldConfigs, masterDataList] = await Promise.all([
    prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        invoices: { orderBy: { lineNo: 'asc' } },
        creator: { select: { name: true } },
      },
    }),
    getCachedFieldConfigs('SHIPMENT'),
    getCachedMasterData({ module: 'SHIPMENT', status: 'Active' }),
  ]);

  if (!shipment) notFound();

  if (user.role === 'ENTRY USER' && shipment.createdBy !== user.id) {
    redirect('/shipments');
  }

  const masterDataMap: Record<string, string[]> = {};
  for (const item of masterDataList || []) {
    if (!masterDataMap[item.category]) masterDataMap[item.category] = [];
    masterDataMap[item.category].push(item.value);
  }

  return (
    <Shell user={user}>
      <ShipmentForm
        mode="edit"
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
