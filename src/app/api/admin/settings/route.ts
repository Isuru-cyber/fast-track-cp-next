import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { invalidateDataCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleName = searchParams.get('module') || 'SHIPMENT';
  const search = searchParams.get('search') || '';
  const typeFilter = searchParams.get('type_filter') || '';
  const statusFilter = searchParams.get('status_filter') || '';

  const where: any = { module: moduleName };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { label: { contains: term, mode: 'insensitive' } },
      { fieldKey: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (typeFilter) {
    where.type = typeFilter;
  }

  if (statusFilter === '1') {
    where.isActive = true;
  } else if (statusFilter === '0') {
    where.isActive = false;
  }

  const fields = await prisma.fieldConfig.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  });

  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;
    invalidateDataCache('field_configs');

    if (action === 'add') {
      const { label, type, field_scope = 'FIXED', module: modName = 'SHIPMENT', is_required = false } = body;
      let options_category = body.options_category ? body.options_category.trim() : null;

      if (type === 'Dropdown' && !options_category) {
        options_category = label.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_');
      }

      const maxOrder = await prisma.fieldConfig.findFirst({
        where: { module: modName },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });

      const nextOrder = (maxOrder?.displayOrder || 0) + 1;
      const fieldKey = `custom_${Date.now()}`;

      const created = await prisma.fieldConfig.create({
        data: {
          fieldKey,
          label: label.trim(),
          type,
          isCustom: true,
          isActive: true,
          isRequired: Boolean(is_required),
          displayOrder: nextOrder,
          optionsCategory: options_category,
          fieldScope: field_scope,
          module: modName,
          createdBy: user.id,
        },
      });

      return NextResponse.json({ success: true, field: created });
    }

    if (action === 'edit') {
      const { id, label, type, field_scope = 'FIXED', is_required, is_active } = body;
      let options_category = body.options_category ? body.options_category.trim() : null;

      if (type === 'Dropdown' && !options_category) {
        options_category = label.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_');
      }

      const updated = await prisma.fieldConfig.update({
        where: { id: Number(id) },
        data: {
          label: label.trim(),
          type,
          fieldScope: field_scope,
          optionsCategory: options_category,
          isRequired: Boolean(is_required),
          isActive: Boolean(is_active),
        },
      });

      return NextResponse.json({ success: true, field: updated });
    }

    if (action === 'toggle_active') {
      const { id } = body;
      const field = await prisma.fieldConfig.findUnique({ where: { id: Number(id) } });
      if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

      const updated = await prisma.fieldConfig.update({
        where: { id: Number(id) },
        data: { isActive: !field.isActive },
      });

      return NextResponse.json({ success: true, field: updated });
    }

    if (action === 'reorder') {
      const { orderIds } = body; // Array of IDs in new order
      if (Array.isArray(orderIds)) {
        await Promise.all(
          orderIds.map((id, index) =>
            prisma.fieldConfig.update({
              where: { id: Number(id) },
              data: { displayOrder: index + 1 },
            })
          )
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'check_delete') {
      const { id } = body;
      const field = await prisma.fieldConfig.findUnique({ where: { id: Number(id) } });
      if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

      // Scan shipments for records containing data in customData for this field
      const shipments = await prisma.shipment.findMany({
        where: { customData: { not: {} } },
        select: { customData: true },
      });

      let count = 0;
      for (const s of shipments) {
        const cd = (s.customData as any) || {};
        if (cd[field.fieldKey] !== undefined && cd[field.fieldKey] !== '' && cd[field.fieldKey] !== null) {
          count++;
        }
      }

      return NextResponse.json({ count, label: field.label, id: field.id });
    }

    if (action === 'force_delete') {
      const { id } = body;
      await prisma.fieldConfig.delete({
        where: { id: Number(id), isCustom: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reset') {
      const { module: modName = 'SHIPMENT' } = body;
      // 1. Delete all custom fields for the module
      await prisma.fieldConfig.deleteMany({
        where: { isCustom: true, module: modName },
      });
      // 2. Reset isActive to true for core fields
      await prisma.fieldConfig.updateMany({
        where: { isCustom: false, module: modName },
        data: { isActive: true },
      });
      return NextResponse.json({ success: true, message: `System settings for ${modName} have been reset to default.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
