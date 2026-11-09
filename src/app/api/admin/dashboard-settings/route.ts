import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const widgets = await prisma.dashboardWidget.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return NextResponse.json(widgets);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
      const { title, type, data_column, metric } = body;

      const widgetKey = `custom_${Date.now()}`;
      const maxOrder = await prisma.dashboardWidget.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });

      const nextOrder = (maxOrder?.displayOrder || 0) + 10;

      const created = await prisma.dashboardWidget.create({
        data: {
          widgetKey,
          title: title.trim(),
          type,
          dataColumn: data_column,
          metric: metric || 'count',
          width: 'col-span-12 lg:col-span-6',
          height: 'h-72',
          displayOrder: nextOrder,
          isVisible: true,
        },
      });

      return NextResponse.json({ success: true, widget: created });
    }

    if (action === 'update_field') {
      const { id, field, value } = body;

      const updateData: any = {};
      if (field === 'width') updateData.width = value;
      if (field === 'height') updateData.height = value;
      if (field === 'is_visible') updateData.isVisible = Boolean(value);

      const updated = await prisma.dashboardWidget.update({
        where: { id: Number(id) },
        data: updateData,
      });

      return NextResponse.json({ success: true, widget: updated });
    }

    if (action === 'reorder') {
      const { orderIds } = body;
      if (Array.isArray(orderIds)) {
        await Promise.all(
          orderIds.map((id, index) =>
            prisma.dashboardWidget.update({
              where: { id: Number(id) },
              data: { displayOrder: (index + 1) * 10 },
            })
          )
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'reset') {
      // Re-seed default widgets
      await prisma.dashboardWidget.deleteMany({});

      const defaultWidgets = [
        { widgetKey: 'kpi_shipments', title: 'Total Shipments', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 10, isVisible: true, dataColumn: null, metric: 'count' },
        { widgetKey: 'kpi_value', title: 'Total Invoice Value', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 20, isVisible: true, dataColumn: null, metric: 'value' },
        { widgetKey: 'kpi_qty', title: 'Total Gross Weight', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 30, isVisible: true, dataColumn: null, metric: 'qty' },
        { widgetKey: 'kpi_cbm', title: 'Total CBM', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 40, isVisible: true, dataColumn: null, metric: 'cbm' },
        { widgetKey: 'kpi_teu', title: 'Total Net Weight', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 50, isVisible: true, dataColumn: null, metric: 'nw' },
        { widgetKey: 'kpi_packages', title: 'Total Packages', type: 'kpi', width: 'col-span-12 lg:col-span-4', height: 'auto', displayOrder: 60, isVisible: true, dataColumn: null, metric: 'packages' },
        { widgetKey: 'stats_strip', title: 'Secondary Stats Strip', type: 'strip', width: 'col-span-12', height: 'auto', displayOrder: 70, isVisible: true, dataColumn: null, metric: 'count' },
        { widgetKey: 'chart_mode', title: 'By Shipment Mode', type: 'chart_pie', width: 'col-span-12 lg:col-span-3', height: 'h-64', displayOrder: 80, isVisible: true, dataColumn: 'shipment_mode', metric: 'count' },
        { widgetKey: 'chart_incoterm', title: 'By Incoterm', type: 'chart_pie', width: 'col-span-12 lg:col-span-3', height: 'h-64', displayOrder: 90, isVisible: true, dataColumn: 'incoterm', metric: 'count' },
        { widgetKey: 'chart_payment', title: 'By Payment Type', type: 'chart_pie', width: 'col-span-12 lg:col-span-3', height: 'h-64', displayOrder: 100, isVisible: true, dataColumn: 'payment_type', metric: 'count' },
        { widgetKey: 'chart_payment_status', title: 'By Payment Status', type: 'chart_pie', width: 'col-span-12 lg:col-span-3', height: 'h-64', displayOrder: 110, isVisible: true, dataColumn: 'payment_status', metric: 'count' },
        { widgetKey: 'chart_customer', title: 'Top 10 Customers', type: 'chart_bar', width: 'col-span-12', height: 'auto', displayOrder: 120, isVisible: true, dataColumn: 'customer_name', metric: 'count' },
        { widgetKey: 'list_top_customers_value', title: 'Top 10 Customers by Value', type: 'chart_bar', width: 'col-span-12', height: 'auto', displayOrder: 130, isVisible: true, dataColumn: 'customer_name', metric: 'value' },
        { widgetKey: 'chart_cha', title: 'By CHA', type: 'chart_bar', width: 'col-span-12 lg:col-span-6', height: 'h-72', displayOrder: 140, isVisible: true, dataColumn: 'cha', metric: 'count' },
        { widgetKey: 'chart_forwarder', title: 'By Forwarder', type: 'chart_bar', width: 'col-span-12 lg:col-span-6', height: 'h-72', displayOrder: 150, isVisible: true, dataColumn: 'forwarder', metric: 'count' },
        { widgetKey: 'chart_package', title: 'By Package Type', type: 'chart_bar', width: 'col-span-12 lg:col-span-6', height: 'h-72', displayOrder: 160, isVisible: true, dataColumn: 'package_type', metric: 'count' },
        { widgetKey: 'chart_port', title: 'By Port', type: 'chart_bar', width: 'col-span-12 lg:col-span-6', height: 'h-72', displayOrder: 170, isVisible: true, dataColumn: 'port', metric: 'count' },
        { widgetKey: 'chart_monthly_trend', title: 'Monthly Shipment Trend', type: 'chart_line', width: 'col-span-12', height: 'h-80', displayOrder: 180, isVisible: true, dataColumn: 'booking_date', metric: 'value' },
      ];

      for (const w of defaultWidgets) {
        await prisma.dashboardWidget.create({ data: w });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
