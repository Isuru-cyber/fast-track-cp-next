import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import BackupManager from '@/components/admin/BackupManager';

export default async function BackupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <Shell user={user} currentPage="/admin/backups">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
          <BackupManager />
        </div>
      </div>
    </Shell>
  );
}
