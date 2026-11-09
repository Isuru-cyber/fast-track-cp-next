import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';
import CalendarView from '@/components/calendar/CalendarView';

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Shell user={user} currentPage="/calendar">
      <CalendarView />
    </Shell>
  );
}
