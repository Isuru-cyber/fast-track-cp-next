import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import DashboardSettingsManager from '@/components/admin/DashboardSettingsManager';

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const customFields = await prisma.fieldConfig.findMany({
    where: {
      module: 'SHIPMENT',
      isActive: true,
      isCustom: true,
    },
    select: {
      fieldKey: true,
      label: true,
    },
  });

  return (
    <Shell user={user} currentPage="/admin/dashboard-settings">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <DashboardSettingsManager customFields={customFields} />
        </div>
      </div>
    </Shell>
  );
}
