import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await prisma.shipmentTemplate.findMany({
    where: { createdBy: user.id },
    orderBy: { templateName: 'asc' },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { template_name, template_data } = await req.json();

    if (!template_name || !template_data) {
      return NextResponse.json({ error: 'Template name and data are required.' }, { status: 400 });
    }

    const template = await prisma.shipmentTemplate.create({
      data: {
        templateName: template_name.trim(),
        templateData: template_data,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save template.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();

    await prisma.shipmentTemplate.deleteMany({
      where: {
        id: Number(id),
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete template.' }, { status: 500 });
  }
}
