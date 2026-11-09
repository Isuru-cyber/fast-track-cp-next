import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateTableInserts(tableName: string, rows: any[]): string {
  if (!rows || rows.length === 0) return `-- No records in ${tableName}\n\n`;

  const columns = Object.keys(rows[0]);
  const colNames = columns.map((c) => `"${c}"`).join(', ');

  let sql = `-- Records for ${tableName} (${rows.length} rows)\n`;
  for (const row of rows) {
    const vals = columns.map((col) => escapeSqlValue(row[col])).join(', ');
    sql += `INSERT INTO "${tableName}" (${colNames}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
  }
  sql += '\n';
  return sql;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin authorization required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const format = searchParams.get('format') || 'stats';

  if (action === 'stats' || format === 'stats') {
    try {
      const [
        usersCount,
        fieldConfigsCount,
        masterDataCount,
        upcomingCount,
        lcsCount,
        ttsCount,
        shipmentsCount,
        invoicesCount,
        templatesCount,
        widgetsCount,
        logsCount,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.fieldConfig.count(),
        prisma.masterData.count(),
        prisma.upcomingShipment.count(),
        prisma.letterOfCredit.count(),
        prisma.telegraphicTransfer.count(),
        prisma.shipment.count(),
        prisma.shipmentInvoice.count(),
        prisma.shipmentTemplate.count(),
        prisma.dashboardWidget.count(),
        prisma.activityLog.count(),
      ]);

      return NextResponse.json({
        success: true,
        stats: {
          users: usersCount,
          fieldConfigs: fieldConfigsCount,
          masterData: masterDataCount,
          upcomingShipments: upcomingCount,
          lettersOfCredit: lcsCount,
          telegraphicTransfers: ttsCount,
          shipments: shipmentsCount,
          shipmentInvoices: invoicesCount,
          shipmentTemplates: templatesCount,
          dashboardWidgets: widgetsCount,
          activityLogs: logsCount,
          totalRecords:
            usersCount +
            fieldConfigsCount +
            masterDataCount +
            upcomingCount +
            lcsCount +
            ttsCount +
            shipmentsCount +
            invoicesCount +
            templatesCount +
            widgetsCount +
            logsCount,
        },
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);

  try {
    const [
      users,
      fieldConfigs,
      masterData,
      upcoming,
      lcs,
      tts,
      shipments,
      invoices,
      templates,
      widgets,
      logs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.fieldConfig.findMany({ orderBy: { id: 'asc' } }),
      prisma.masterData.findMany({ orderBy: { id: 'asc' } }),
      prisma.upcomingShipment.findMany({ orderBy: { id: 'asc' } }),
      prisma.letterOfCredit.findMany({ orderBy: { id: 'asc' } }),
      prisma.telegraphicTransfer.findMany({ orderBy: { id: 'asc' } }),
      prisma.shipment.findMany({ orderBy: { id: 'asc' } }),
      prisma.shipmentInvoice.findMany({ orderBy: { id: 'asc' } }),
      prisma.shipmentTemplate.findMany({ orderBy: { id: 'asc' } }),
      prisma.dashboardWidget.findMany({ orderBy: { id: 'asc' } }),
      prisma.activityLog.findMany({ orderBy: { id: 'asc' } }),
    ]);

    if (format === 'json') {
      const backupData = {
        meta: {
          system: 'Fast-Track Logistics & Cargo Management Enterprise',
          backupDate: new Date().toISOString(),
          version: '2.0.0',
          generatedBy: user.username,
          tableCounts: {
            users: users.length,
            fieldConfigs: fieldConfigs.length,
            masterData: masterData.length,
            upcomingShipments: upcoming.length,
            lettersOfCredit: lcs.length,
            telegraphicTransfers: tts.length,
            shipments: shipments.length,
            shipmentInvoices: invoices.length,
            shipmentTemplates: templates.length,
            dashboardWidgets: widgets.length,
            activityLogs: logs.length,
          },
        },
        data: {
          users,
          fieldConfigs,
          masterData,
          upcomingShipments: upcoming,
          lettersOfCredit: lcs,
          telegraphicTransfers: tts,
          shipments,
          shipmentInvoices: invoices,
          shipmentTemplates: templates,
          dashboardWidgets: widgets,
          activityLogs: logs,
        },
      };

      return new NextResponse(JSON.stringify(backupData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename=fast_track_db_backup_${timestamp}.json`,
        },
      });
    }

    if (format === 'sql') {
      let sql = `-- =========================================================\n`;
      sql += `-- FAST-TRACK ENTERPRISE DATABASE BACKUP DUMP\n`;
      sql += `-- Generated: ${new Date().toISOString()}\n`;
      sql += `-- Generated by Admin: ${user.username} (ID: ${user.id})\n`;
      sql += `-- =========================================================\n\n`;
      sql += `BEGIN;\n\n`;

      sql += generateTableInserts('users', users);
      sql += generateTableInserts('field_configs', fieldConfigs);
      sql += generateTableInserts('master_data', masterData);
      sql += generateTableInserts('upcoming_shipments', upcoming);
      sql += generateTableInserts('letters_of_credit', lcs);
      sql += generateTableInserts('telegraphic_transfers', tts);
      sql += generateTableInserts('shipments', shipments);
      sql += generateTableInserts('shipment_invoices', invoices);
      sql += generateTableInserts('shipment_templates', templates);
      sql += generateTableInserts('dashboard_widgets', widgets);
      sql += generateTableInserts('activity_logs', logs);

      sql += `COMMIT;\n`;

      return new NextResponse(sql, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql; charset=utf-8',
          'Content-Disposition': `attachment; filename=fast_track_db_dump_${timestamp}.sql`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format requested' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
