import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedFieldConfigs } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import UpcomingManager from '@/components/upcoming/UpcomingManager';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function UpcomingPage() {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') redirect('/dashboard');

  let fieldConfigs: any[] = [];
  let upcoming: any[] = [];

  try {
    const results = await Promise.all([
      getCachedFieldConfigs('UPCOMING'),
      prisma.upcomingShipment.findMany({
        where: { status: 'Pending' },
        orderBy: { estimateDate: 'asc' },
      }),
    ]);
    fieldConfigs = results[0] || [];
    upcoming = results[1] || [];
  } catch (err) {
    console.error('Error fetching upcoming data:', err);
  }

  return (
    <Shell user={user}>
      <UpcomingManager
        upcoming={upcoming}
        fieldConfigs={fieldConfigs}
        isAdmin={user.role === 'ADMIN'}
      />
    </Shell>
  );
}
