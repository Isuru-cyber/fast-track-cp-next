import { prisma } from './db';

export async function logActivity(userId: number | null, action: string, recordId: string | null, oldValue?: string | null, newValue?: string | null) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        recordId: recordId ? String(recordId) : null,
        oldValue: oldValue || null,
        newValue: newValue || null,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
