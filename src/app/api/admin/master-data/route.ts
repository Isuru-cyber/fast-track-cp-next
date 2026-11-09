import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { invalidateDataCache } from '@/lib/cache';

const SYNC_CATEGORIES = ['CUSTOMER_NAME'];

async function syncMasterDataAcrossModules(category: string, value: string, status: string) {
  if (status === 'Active') {
    const modules = ['SHIPMENT', 'LC', 'UPCOMING'];
    for (const mod of modules) {
      const existing = await prisma.masterData.findFirst({
        where: {
          category,
          value: { equals: value, mode: 'insensitive' },
          module: mod,
        },
      });

      if (existing) {
        if (existing.status !== 'Active') {
          await prisma.masterData.update({
            where: { id: existing.id },
            data: { status: 'Active' },
          });
        }
      } else {
        await prisma.masterData.create({
          data: {
            category,
            value,
            module: mod,
            status: 'Active',
          },
        });
      }
    }
  } else {
    await prisma.masterData.updateMany({
      where: { category, value },
      data: { status },
    });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleName = searchParams.get('module') || 'SHIPMENT';

  const data = await prisma.masterData.findMany({
    where: {
      module: moduleName,
      status: 'Active',
    },
    orderBy: [{ category: 'asc' }, { value: 'asc' }],
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, category, value, module: modName = 'SHIPMENT', id } = body;
    invalidateDataCache('master_data');

    if (action === 'add') {
      const trimmedVal = (value || '').trim();
      if (!trimmedVal) {
        return NextResponse.json({ error: 'Value is required.' }, { status: 400 });
      }

      if (SYNC_CATEGORIES.includes(category)) {
        await syncMasterDataAcrossModules(category, trimmedVal, 'Active');
        return NextResponse.json({ success: true, message: 'Option synced and added to all modules.' });
      }

      const existing = await prisma.masterData.findFirst({
        where: {
          category,
          value: { equals: trimmedVal, mode: 'insensitive' },
          module: modName,
        },
      });

      if (existing) {
        if (existing.status === 'Active') {
          return NextResponse.json({ error: 'This option already exists in the selected category.' }, { status: 400 });
        } else {
          await prisma.masterData.update({
            where: { id: existing.id },
            data: { status: 'Active' },
          });
          return NextResponse.json({ success: true, message: 'Restored previously deleted option.' });
        }
      }

      const created = await prisma.masterData.create({
        data: {
          category,
          value: trimmedVal,
          module: modName,
          status: 'Active',
          createdBy: user.id,
        },
      });

      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'delete') {
      const masterItem = await prisma.masterData.findUnique({ where: { id: Number(id) } });
      if (!masterItem) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      await prisma.masterData.update({
        where: { id: Number(id) },
        data: { status: 'Inactive' },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete_sync') {
      await syncMasterDataAcrossModules(category, value, 'Inactive');
      return NextResponse.json({ success: true, message: 'Option marked as inactive across all modules.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
