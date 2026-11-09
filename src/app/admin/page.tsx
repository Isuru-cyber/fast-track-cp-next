import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'VIEW') redirect('/dashboard');

  if (user.role === 'ADMIN') {
    redirect('/admin/settings');
  } else {
    redirect('/admin/master-data');
  }
}
