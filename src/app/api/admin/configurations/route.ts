import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCachedSystemConfig, invalidateSystemConfigCache } from '@/lib/cache';
import { DEFAULT_SYSTEM_CONFIG, SystemConfig } from '@/lib/config';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
  }

  try {
    const config = await getCachedSystemConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    console.error('Error fetching system configurations:', err);
    return NextResponse.json(DEFAULT_SYSTEM_CONFIG);
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const currentConfig = await getCachedSystemConfig();

    const updatedConfig: SystemConfig = {
      ...currentConfig,
      ...body,
    };

    const existing = await prisma.masterData.findFirst({
      where: {
        category: 'SYSTEM_CONFIG',
        module: 'SYSTEM',
      },
    });

    if (existing) {
      await prisma.masterData.update({
        where: { id: existing.id },
        data: {
          value: JSON.stringify(updatedConfig),
          status: 'Active',
        },
      });
    } else {
      await prisma.masterData.create({
        data: {
          category: 'SYSTEM_CONFIG',
          module: 'SYSTEM',
          value: JSON.stringify(updatedConfig),
          status: 'Active',
          createdBy: user.id,
        },
      });
    }

    invalidateSystemConfigCache();

    // Log the configuration update
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_SYSTEM_CONFIG',
        recordId: 'SYSTEM_CONFIG',
        oldValue: JSON.stringify(currentConfig),
        newValue: JSON.stringify(updatedConfig),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'System configurations saved successfully',
      config: updatedConfig,
    });
  } catch (err: any) {
    console.error('Error updating system configurations:', err);
    return NextResponse.json({ error: err.message || 'Failed to update system configurations' }, { status: 500 });
  }
}
