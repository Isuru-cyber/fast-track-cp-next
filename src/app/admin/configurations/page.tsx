import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCachedSystemConfig } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import ConfigurationManager from '@/components/admin/ConfigurationManager';

export default async function ConfigurationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const config = await getCachedSystemConfig();

  return (
    <Shell user={user} currentPage="/admin/configurations">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <ConfigurationManager initialConfig={config} />
        </div>
      </div>
    </Shell>
  );
}
