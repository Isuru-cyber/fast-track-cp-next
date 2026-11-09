import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';
import ProfileManager from '@/components/profile/ProfileManager';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Shell user={user} currentPage="/profile">
      <ProfileManager user={user} />
    </Shell>
  );
}
