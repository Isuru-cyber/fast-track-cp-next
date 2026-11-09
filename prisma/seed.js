const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase database...');

  // 1. Default Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      status: 'Active',
    },
  });
  console.log('Admin user seeded:', adminUser.username);

  // 2. Default Shipment Field Configs (31 fields)
  const shipmentFields = [
    { fieldKey: 'no', label: 'No.', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 1, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'bookingDate', label: 'Booking Date', type: 'Date', isCustom: false, isActive: true, isRequired: false, displayOrder: 2, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'refNumber', label: 'Ref Number', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 4, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'customerName', label: 'Customer Name', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 3, optionsCategory: 'CUSTOMER_NAME', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'paymentType', label: 'Payment Type', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 5, optionsCategory: 'PAYMENT_TYPE', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'payRefNo', label: 'Pay Ref No', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 6, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'invoiceNo', label: 'Invoice No', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 7, optionsCategory: null, fieldScope: 'LINE', module: 'SHIPMENT' },
    { fieldKey: 'packageType', label: 'Package Type', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 8, optionsCategory: 'PACKAGE_TYPE', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'hsCode', label: 'HS Code', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 9, optionsCategory: 'HS_CODE', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'elementsCount', label: 'Elements Count', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 10, optionsCategory: null, fieldScope: 'LINE', module: 'SHIPMENT' },
    { fieldKey: 'primaryQtyNw', label: 'Primary Qty (NW)', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 11, optionsCategory: null, fieldScope: 'LINE', module: 'SHIPMENT' },
    { fieldKey: 'secondaryQtyGw', label: 'Secondary Qty (GW)', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 12, optionsCategory: null, fieldScope: 'LINE', module: 'SHIPMENT' },
    { fieldKey: 'shipmentMode', label: 'Shipment Mode', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 13, optionsCategory: 'SHIPMENT_MODE', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'incoterm', label: 'Incoterm', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 14, optionsCategory: 'INCOTERM', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'shipmentValue', label: 'Shipment Value', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 15, optionsCategory: null, fieldScope: 'LINE', module: 'SHIPMENT' },
    { fieldKey: 'cbm', label: 'CBM', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 16, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'delFrom', label: 'Del From', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 17, optionsCategory: 'DEL_FROM', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'delTo', label: 'Del To', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 18, optionsCategory: 'DEL_TO', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'blAwb', label: 'BL / AWB', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 19, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'port', label: 'Port', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 20, optionsCategory: 'PORT', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'cha', label: 'CHA', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 21, optionsCategory: 'CHA', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'cusdc', label: 'CUSDC', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 22, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'cusdcDate', label: 'CUSDC Date', type: 'Date', isCustom: false, isActive: true, isRequired: false, displayOrder: 23, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'forwarderType', label: 'Forwarder Type', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 24, optionsCategory: 'FORWARDER_TYPE', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'forwarder', label: 'Forwarder', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 25, optionsCategory: 'FORWARDER', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'quotationValue', label: 'Quotation Value', type: 'Number', isCustom: false, isActive: true, isRequired: false, displayOrder: 26, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'delStatus', label: 'Del Status', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 27, optionsCategory: 'DELIVERY_STATUS', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'paymentStatus', label: 'Payment Status', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 28, optionsCategory: 'PAYMENT_STATUS', fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'remark', label: 'Remark', type: 'Long Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 29, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'createdByName', label: 'Created By', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 30, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
    { fieldKey: 'createdAt', label: 'Created At', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 31, optionsCategory: null, fieldScope: 'FIXED', module: 'SHIPMENT' },
  ];

  for (const f of shipmentFields) {
    await prisma.fieldConfig.upsert({
      where: { field_key_module: { fieldKey: f.fieldKey, module: f.module } },
      update: f,
      create: f,
    });
  }

  // 3. Upcoming Field Configs (8 fields)
  const upcomingFields = [
    { fieldKey: 'estimateDate', label: 'Estimate Date', type: 'Date', isCustom: false, isActive: true, isRequired: true, displayOrder: 1, optionsCategory: null, fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'customerName', label: 'Customer Name', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 2, optionsCategory: 'CUSTOMER_NAME', fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'shipmentMode', label: 'Shipment Mode', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 3, optionsCategory: 'SHIPMENT_MODE', fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'containerType', label: 'Container Type', type: 'Dropdown', isCustom: false, isActive: true, isRequired: false, displayOrder: 4, optionsCategory: 'CONTAINER_TYPE', fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'approxQty', label: 'Approx Qty', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 5, optionsCategory: null, fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'cbm', label: 'CBM', type: 'Decimal', isCustom: false, isActive: true, isRequired: false, displayOrder: 6, optionsCategory: null, fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'remarks', label: 'Remarks', type: 'Text', isCustom: false, isActive: true, isRequired: false, displayOrder: 7, optionsCategory: null, fieldScope: 'FIXED', module: 'UPCOMING' },
    { fieldKey: 'status', label: 'Status', type: 'Dropdown', isCustom: false, isActive: true, isRequired: true, displayOrder: 8, optionsCategory: 'STATUS', fieldScope: 'FIXED', module: 'UPCOMING' },
  ];

  for (const f of upcomingFields) {
    await prisma.fieldConfig.upsert({
      where: { field_key_module: { fieldKey: f.fieldKey, module: f.module } },
      update: f,
      create: f,
    });
  }

  // 4. Master Data
  const masterDataList = [
    // SHIPMENT
    { category: 'DELIVERY_STATUS', value: 'Pending', status: 'Active', module: 'SHIPMENT' },
    { category: 'DELIVERY_STATUS', value: 'Delivered', status: 'Active', module: 'SHIPMENT' },
    { category: 'PAYMENT_STATUS', value: 'Pending', status: 'Active', module: 'SHIPMENT' },
    { category: 'PAYMENT_STATUS', value: 'Paid', status: 'Active', module: 'SHIPMENT' },
    { category: 'PAYMENT_TYPE', value: 'LC', status: 'Active', module: 'SHIPMENT' },
    { category: 'PAYMENT_TYPE', value: 'TT', status: 'Active', module: 'SHIPMENT' },
    // UPCOMING
    { category: 'SHIPMENT_MODE', value: 'Air', status: 'Active', module: 'UPCOMING' },
    { category: 'SHIPMENT_MODE', value: 'Sea', status: 'Active', module: 'UPCOMING' },
    { category: 'CONTAINER_TYPE', value: '20ft', status: 'Active', module: 'UPCOMING' },
    { category: 'CONTAINER_TYPE', value: '40ft', status: 'Active', module: 'UPCOMING' },
    { category: 'CONTAINER_TYPE', value: 'LCL', status: 'Active', module: 'UPCOMING' },
    { category: 'STATUS', value: 'PENDING', status: 'Active', module: 'UPCOMING' },
    { category: 'STATUS', value: 'DONE', status: 'Active', module: 'UPCOMING' },
  ];

  for (const m of masterDataList) {
    const existing = await prisma.masterData.findFirst({
      where: { category: m.category, value: m.value, module: m.module },
    });
    if (!existing) {
      await prisma.masterData.create({ data: m });
    }
  }

  // 5. Dashboard Widgets (18 widgets)
  const widgets = [
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

  for (const w of widgets) {
    await prisma.dashboardWidget.upsert({
      where: { widgetKey: w.widgetKey },
      update: w,
      create: w,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
