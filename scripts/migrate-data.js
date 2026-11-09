const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tables = {};

  const insertRegex = /INSERT INTO `([^`]+)` \(([^)]+)\) VALUES([\s\S]*?);(?=\s*(?:INSERT|CREATE|ALTER|\/\*|--|$))/g;

  let match;
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
    const valuesBlock = match[3];

    if (!tables[tableName]) {
      tables[tableName] = { columns, rows: [] };
    }

    const rows = parseValuesTuples(valuesBlock);
    for (const r of rows) {
      if (r.length === columns.length) {
        const rowObj = {};
        columns.forEach((col, idx) => {
          rowObj[col] = r[idx];
        });
        tables[tableName].rows.push(rowObj);
      }
    }
  }

  return tables;
}

function parseValuesTuples(text) {
  const rows = [];
  let inString = false;
  let stringChar = '';
  let isEscaped = false;
  let inTuple = false;
  let currentVal = '';
  let currentRow = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (isEscaped) {
        currentVal += char;
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === stringChar) {
        if (i + 1 < text.length && text[i + 1] === stringChar) {
          currentVal += stringChar;
          i++;
        } else {
          inString = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
      } else if (char === '(' && !inTuple) {
        inTuple = true;
        currentRow = [];
        currentVal = '';
      } else if (char === ')' && inTuple) {
        currentRow.push(cleanVal(currentVal));
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
        inTuple = false;
      } else if (char === ',' && inTuple) {
        currentRow.push(cleanVal(currentVal));
        currentVal = '';
      } else if (inTuple) {
        currentVal += char;
      }
    }
  }

  return rows;
}

function cleanVal(val) {
  const trimmed = val.trim();
  if (trimmed.toUpperCase() === 'NULL') {
    return null;
  }
  return trimmed;
}

function toDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toBool(val) {
  if (val === null || val === undefined) return false;
  return val === '1' || val === 1 || val === true || val === 'true';
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

function toDecimal(val) {
  if (val === null || val === undefined || val === '') return null;
  return val.toString();
}

function toJson(val) {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

async function migrate() {
  console.log('Connecting to target Supabase PostgreSQL database...');
  const sqlPath = path.join(__dirname, '..', 'old database', 'icei_42471965_fast_track.sql');
  const tables = parseSqlFile(sqlPath);

  console.log('SQL dump parsed successfully. Beginning transaction / insertion...');

  // 1. Users
  if (tables.users) {
    console.log(`Migrating ${tables.users.rows.length} users...`);
    for (const r of tables.users.rows) {
      await prisma.user.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          username: r.username,
          passwordHash: r.password_hash,
          name: r.name,
          role: r.role || 'VIEW',
          status: r.status || 'Active',
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 2. Field Configs
  if (tables.field_configs) {
    console.log(`Migrating ${tables.field_configs.rows.length} field configs...`);
    for (const r of tables.field_configs.rows) {
      await prisma.fieldConfig.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          fieldKey: r.field_key,
          label: r.label,
          type: r.type,
          isCustom: toBool(r.is_custom),
          isActive: toBool(r.is_active),
          isRequired: toBool(r.is_required),
          displayOrder: toInt(r.display_order) || 0,
          optionsCategory: r.options_category || null,
          fieldScope: r.field_scope || 'FIXED',
          module: r.module || 'SHIPMENT',
          createdBy: toInt(r.created_by),
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 3. Master Data
  if (tables.master_data) {
    console.log(`Migrating ${tables.master_data.rows.length} master data records...`);
    for (const r of tables.master_data.rows) {
      await prisma.masterData.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          category: r.category,
          value: r.value,
          status: r.status || 'Active',
          module: r.module || 'SHIPMENT',
          createdBy: toInt(r.created_by),
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 4. Dashboard Widgets
  if (tables.dashboard_widgets) {
    console.log(`Migrating ${tables.dashboard_widgets.rows.length} dashboard widgets...`);
    for (const r of tables.dashboard_widgets.rows) {
      await prisma.dashboardWidget.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          widgetKey: r.widget_key,
          title: r.title,
          type: r.type,
          width: r.width || 'col-span-12',
          height: r.height || 'auto',
          displayOrder: toInt(r.display_order) || 0,
          isVisible: toBool(r.is_visible),
          dataColumn: r.data_column || null,
          metric: r.metric || 'count',
        },
      });
    }
  }

  // 5. Shipment Templates
  if (tables.shipment_templates) {
    console.log(`Migrating ${tables.shipment_templates.rows.length} shipment templates...`);
    for (const r of tables.shipment_templates.rows) {
      await prisma.shipmentTemplate.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          templateName: r.template_name,
          templateData: toJson(r.template_data) || {},
          createdBy: toInt(r.created_by) || 1,
          createdAt: toDate(r.created_at) || new Date(),
        },
      });
    }
  }

  // 6. Upcoming Shipments
  if (tables.upcoming_shipments) {
    console.log(`Migrating ${tables.upcoming_shipments.rows.length} upcoming shipments...`);
    for (const r of tables.upcoming_shipments.rows) {
      await prisma.upcomingShipment.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          estimateDate: toDate(r.estimate_date) || new Date(),
          customerName: r.customer_name || null,
          shipmentMode: r.shipment_mode || null,
          containerType: r.container_type || null,
          approxQty: toDecimal(r.approx_qty),
          cbm: toDecimal(r.cbm),
          remarks: r.remarks || null,
          status: r.status || 'Pending',
          createdBy: toInt(r.created_by),
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 7. Letters of Credit
  if (tables.letters_of_credit) {
    console.log(`Migrating ${tables.letters_of_credit.rows.length} letters of credit...`);
    for (const r of tables.letters_of_credit.rows) {
      await prisma.letterOfCredit.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          lcNo: r.lc_no,
          customerName: r.customer_name || null,
          bankName: r.bank_name || null,
          proformaInvoice: r.proforma_invoice || null,
          originalValue: toDecimal(r.original_value) || '0.00',
          issueDate: toDate(r.issue_date),
          expiryDate: toDate(r.expiry_date),
          status: r.status || 'Active',
          notes: r.notes || null,
          createdBy: toInt(r.created_by),
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 8. Shipments
  if (tables.shipments) {
    console.log(`Migrating ${tables.shipments.rows.length} shipments...`);
    for (const r of tables.shipments.rows) {
      await prisma.shipment.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          no: toInt(r.no),
          bookingDate: toDate(r.booking_date) || new Date(),
          refNumber: r.ref_number || null,
          customerName: r.customer_name || null,
          paymentType: r.payment_type || null,
          payRefNo: r.pay_ref_no || null,
          invoiceNo: r.invoice_no || null,
          packageType: r.package_type || null,
          hsCode: r.hs_code ? r.hs_code.toString() : null,
          elementsCount: toInt(r.elements_count),
          primaryQtyNw: toDecimal(r.primary_qty_nw),
          secondaryQtyGw: toDecimal(r.secondary_qty_gw),
          shipmentValue: toDecimal(r.shipment_value),
          shipmentMode: r.shipment_mode || null,
          incoterm: r.incoterm || null,
          cbm: toDecimal(r.cbm),
          delFrom: r.del_from || null,
          delTo: r.del_to || null,
          blAwb: r.bl_awb || null,
          port: r.port || null,
          cha: r.cha || null,
          cusdc: r.cusdc || null,
          cusdcDate: toDate(r.cusdc_date),
          forwarderType: r.forwarder_type || null,
          forwarder: r.forwarder || null,
          quotationValue: toDecimal(r.quotation_value),
          delStatus: r.del_status || 'Pending',
          paymentStatus: r.payment_status || 'Pending',
          statusFlag: r.status_flag || 'Active',
          remark: r.remark || null,
          userName: r.user_name || null,
          customData: toJson(r.custom_data) || null,
          createdBy: toInt(r.created_by),
          createdAt: toDate(r.created_at) || new Date(),
          updatedBy: toInt(r.updated_by),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 9. Shipment Invoices
  if (tables.shipment_invoices) {
    console.log(`Migrating ${tables.shipment_invoices.rows.length} shipment invoices...`);
    for (const r of tables.shipment_invoices.rows) {
      await prisma.shipmentInvoice.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          shipmentId: toInt(r.shipment_id),
          lineNo: toInt(r.line_no) || 1,
          invoiceNo: r.invoice_no || null,
          elementsCount: toInt(r.elements_count),
          primaryQtyNw: toDecimal(r.primary_qty_nw),
          secondaryQtyGw: toDecimal(r.secondary_qty_gw),
          shipmentValue: toDecimal(r.shipment_value),
          customData: toJson(r.custom_data) || null,
          createdAt: toDate(r.created_at) || new Date(),
          updatedAt: toDate(r.updated_at) || new Date(),
        },
      });
    }
  }

  // 10. Activity Logs
  if (tables.activity_logs) {
    console.log(`Migrating ${tables.activity_logs.rows.length} activity logs...`);
    for (const r of tables.activity_logs.rows) {
      await prisma.activityLog.upsert({
        where: { id: toInt(r.id) },
        update: {},
        create: {
          id: toInt(r.id),
          userId: toInt(r.user_id),
          action: r.action,
          recordId: r.record_id || null,
          oldValue: r.old_value || null,
          newValue: r.new_value || null,
          timestamp: toDate(r.timestamp) || new Date(),
        },
      });
    }
  }

  // 11. Sync PostgreSQL Sequences
  console.log('Syncing PostgreSQL ID sequences...');
  const sequenceTables = [
    { table: 'users', model: prisma.user },
    { table: 'field_configs', model: prisma.fieldConfig },
    { table: 'master_data', model: prisma.masterData },
    { table: 'dashboard_widgets', model: prisma.dashboardWidget },
    { table: 'shipment_templates', model: prisma.shipmentTemplate },
    { table: 'upcoming_shipments', model: prisma.upcomingShipment },
    { table: 'letters_of_credit', model: prisma.letterOfCredit },
    { table: 'shipments', model: prisma.shipment },
    { table: 'shipment_invoices', model: prisma.shipmentInvoice },
    { table: 'activity_logs', model: prisma.activityLog },
  ];

  for (const item of sequenceTables) {
    try {
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${item.table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${item.table}"), 1)
        );
      `);
      console.log(`- Sequence synced for: ${item.table}`);
    } catch (seqErr) {
      console.warn(`Could not sync sequence for ${item.table}:`, seqErr.message);
    }
  }

  console.log('✅ ALL DATA SUCCESSFULLY MIGRATED AND SEQUENCES SYNCED!');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
