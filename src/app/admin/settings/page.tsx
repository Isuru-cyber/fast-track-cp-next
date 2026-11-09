import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import SettingsManager from '@/components/admin/SettingsManager';

interface Props {
  searchParams: Promise<{
    module?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const resolved = await searchParams;
  const initialModule = resolved.module || 'SHIPMENT';

  return (
    <Shell user={user} currentPage="/admin/settings">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <SettingsManager initialModule={initialModule} />
        </div>
      </div>
    </Shell>
  );
}
