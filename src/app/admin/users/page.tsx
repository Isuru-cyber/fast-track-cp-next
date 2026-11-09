import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import UserManager from '@/components/admin/UserManager';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <Shell user={user} currentPage="/admin/users">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <UserManager currentUserId={user.id} />
        </div>
      </div>
    </Shell>
  );
}
