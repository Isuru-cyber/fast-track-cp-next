import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs, getCachedMasterData } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import ShipmentForm from '@/components/shipments/ShipmentForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Props {
  searchParams: Promise<{ from_upcoming?: string }>;
}

export default async function NewShipmentPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  const resolvedParams = (await searchParams) || {};
  let initialShipmentData: any = undefined;

  if (resolvedParams.from_upcoming) {
    const upcomingId = parseInt(resolvedParams.from_upcoming, 10);
    if (!isNaN(upcomingId)) {
      const up = await prisma.upcomingShipment.findUnique({ where: { id: upcomingId } });
      if (up) {
        initialShipmentData = {
          customerName: up.customerName || '',
          shipmentMode: up.shipmentMode || '',
          cbm: up.cbm ? String(up.cbm) : '',
          packageType: up.containerType || '',
          remark: up.remarks ? `Converted from Upcoming #${up.id}: ${up.remarks}` : `Converted from Upcoming #${up.id}`,
          invoices: [
            {
              invoiceNo: '',
              elementsCount: '',
              primaryQtyNw: up.approxQty ? String(up.approxQty) : '',
              secondaryQtyGw: '',
              shipmentValue: '',
            },
          ],
        };
      }
    }
  }

  const [fieldConfigs, masterDataList, maxShipment] = await Promise.all([
    getCachedFieldConfigs('SHIPMENT'),
    getCachedMasterData({ module: 'SHIPMENT', status: 'Active' }),
    prisma.shipment.findFirst({
      orderBy: { no: 'desc' },
      select: { no: true },
    }),
  ]);

  const masterDataMap: Record<string, string[]> = {};
  for (const item of masterDataList || []) {
    if (!masterDataMap[item.category]) masterDataMap[item.category] = [];
    masterDataMap[item.category].push(item.value);
  }

  const nextNo = maxShipment && maxShipment.no ? maxShipment.no + 1 : 1;
  const paddedNextNo = String(nextNo).padStart(4, '0');

  return (
    <Shell user={user}>
      <ShipmentForm
        mode="new"
        initialShipment={initialShipmentData}
        fieldConfigs={fieldConfigs}
        masterData={masterDataMap}
        nextNo={paddedNextNo}
        userName={user.name}
        isAdmin={user.role === 'ADMIN'}
      />
    </Shell>
  );
}
