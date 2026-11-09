'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

interface TableStats {
  users: number;
  fieldConfigs: number;
  masterData: number;
  upcomingShipments: number;
  lettersOfCredit: number;
  telegraphicTransfers: number;
  shipments: number;
  shipmentInvoices: number;
  shipmentTemplates: number;
  dashboardWidgets: number;
  activityLogs: number;
  totalRecords: number;
}

export default function BackupManager() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<TableStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/backups?action=stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to fetch database stats', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error connecting to database', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadBackup = (format: 'json' | 'sql') => {
    setDownloading(format);
    showToast(`Generating ${format.toUpperCase()} database backup...`, 'info');
    window.location.href = `/api/admin/backups?format=${format}`;
    setTimeout(() => {
      setDownloading(null);
      showToast(`Backup download initiated successfully.`, 'success');
    }, 2000);
  };

  const handleExport = (endpoint: string, label: string) => {
    setDownloading(label);
    showToast(`Generating ${label}...`, 'info');
    window.location.href = endpoint;
    setTimeout(() => {
      setDownloading(null);
      showToast(`${label} downloaded successfully.`, 'success');
    }, 2000);
  };

  const tablesList = [
    { name: 'Shipments', key: 'shipments', icon: 'fa-box', desc: 'Main cargo entries & shipments ledger' },
    { name: 'Shipment Invoices', key: 'shipmentInvoices', icon: 'fa-file-invoice-dollar', desc: 'Itemized invoice lines & commercial values' },
    { name: 'Letters of Credit', key: 'lettersOfCredit', icon: 'fa-landmark', desc: 'LC balance, financial allocations & margins' },
    { name: 'Telegraphic Transfers', key: 'telegraphicTransfers', icon: 'fa-money-bill-transfer', desc: 'TT ledger, remittances & advance allocations' },
    { name: 'Upcoming Shipments', key: 'upcomingShipments', icon: 'fa-calendar-alt', desc: 'Expected pipeline & scheduled shipments' },
    { name: 'Master Data Catalog', key: 'masterData', icon: 'fa-tags', desc: 'Lookup options, ports, CHA, forwarders & banks' },
    { name: 'Custom Field Configs', key: 'fieldConfigs', icon: 'fa-sliders-h', desc: 'Dynamic column schema & system definitions' },
    { name: 'System Users', key: 'users', icon: 'fa-users', desc: 'Enterprise accounts, permissions & roles' },
    { name: 'Shipment Templates', key: 'shipmentTemplates', icon: 'fa-copy', desc: 'Reusable shipment default profiles' },
    { name: 'Dashboard Widgets', key: 'dashboardWidgets', icon: 'fa-chart-pie', desc: 'Custom layout metrics & card placements' },
    { name: 'Activity Logs', key: 'activityLogs', icon: 'fa-clock-rotate-left', desc: 'Audit trail, modification logs & user history' },
  ];

  const exportCards = [
    {
      title: 'Shipments Master Register',
      desc: 'All active & completed shipments with dates, customs, CHA, forwarders, and values.',
      endpoint: '/api/export/shipments',
      icon: 'fa-truck-fast',
      color: 'blue',
      countKey: 'shipments',
    },
    {
      title: 'Letters of Credit (LC) Report',
      desc: 'Complete LC financial statements with original values, utilized sums, and available balances.',
      endpoint: '/api/export/lc',
      icon: 'fa-file-invoice',
      color: 'emerald',
      countKey: 'lettersOfCredit',
    },
    {
      title: 'Telegraphic Transfers (TT) Report',
      desc: 'TT records with proforma numbers, banks, drawn down totals, and pending balances.',
      endpoint: '/api/export/tt',
      icon: 'fa-money-bill-wave',
      color: 'indigo',
      countKey: 'telegraphicTransfers',
    },
    {
      title: 'Upcoming Cargo Pipeline',
      desc: 'Scheduled future imports, estimated dates, container specs, and volume estimates.',
      endpoint: '/api/export/upcoming',
      icon: 'fa-calendar-check',
      color: 'purple',
      countKey: 'upcomingShipments',
    },
    {
      title: 'Master Data Reference Catalog',
      desc: 'Full directory of ports, customers, forwarders, CHA agents, packages, and payment modes.',
      endpoint: '/api/export/master-data',
      icon: 'fa-database',
      color: 'amber',
      countKey: 'masterData',
    },
    {
      title: 'System Users & Roles Directory',
      desc: 'Administrative export of all user accounts, role allocations, and access statuses.',
      endpoint: '/api/export/users',
      icon: 'fa-users-gear',
      color: 'slate',
      countKey: 'users',
    },
    {
      title: 'Audit & Activity Logs',
      desc: 'Timestamped record of all creation, update, and deletion operations performed in the system.',
      endpoint: '/api/export/logs',
      icon: 'fa-history',
      color: 'rose',
      countKey: 'activityLogs',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Action Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-sm md:text-base font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-cloud-arrow-down text-indigo-600"></i>
            Database Backups & Business Reports
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate full PostgreSQL database backups, JSON snapshots, and downloadable Excel/CSV business reports across all logistics modules.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loadingStats}
          className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <i className={`fas fa-rotate ${loadingStats ? 'fa-spin' : ''}`}></i>
          <span>Refresh Database Stats</span>
        </button>
      </div>

      {/* Database Backup Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-hard-drive text-indigo-500"></i>
              System Database Backups
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Create and download complete live snapshots of all 11 database tables for offline security or disaster recovery.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Supabase Live Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JSON Backup Card */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-white p-5 rounded-xl border border-indigo-100 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {'{ }'}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                  JSON FORMAT
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Full JSON Database Snapshot</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Exports all system tables, configs, user accounts, and relationships into a formatted JSON structure. Ideal for data migrations, API import/export, and audit preservation.
              </p>
            </div>

            <button
              onClick={() => handleDownloadBackup('json')}
              disabled={downloading === 'json'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <i className={`fas ${downloading === 'json' ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
              <span>{downloading === 'json' ? 'Generating JSON...' : 'Download JSON Backup (.json)'}</span>
            </button>
          </div>

          {/* SQL Dump Card */}
          <div className="bg-gradient-to-br from-blue-50/60 to-white p-5 rounded-xl border border-blue-100 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <i className="fas fa-terminal text-sm"></i>
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                  SQL INSERT DUMP
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">PostgreSQL SQL Script Dump</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Generates atomic SQL INSERT statements wrapped in transaction blocks. Can be executed directly in the Supabase SQL Editor or standard psql client to restore data.
              </p>
            </div>

            <button
              onClick={() => handleDownloadBackup('sql')}
              disabled={downloading === 'sql'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <i className={`fas ${downloading === 'sql' ? 'fa-spinner fa-spin' : 'fa-database'}`}></i>
              <span>{downloading === 'sql' ? 'Generating SQL Dump...' : 'Download SQL Dump (.sql)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Table Inventory & Count Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-table-list text-gray-600"></i>
              Live Database Tables & Record Volume
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Current inventory of all relational tables in the enterprise database.
            </p>
          </div>
          {stats && (
            <div className="text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              Total Database Records: <span className="text-indigo-600 font-bold">{stats.totalRecords.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tablesList.map((t) => {
            const count = stats ? (stats as any)[t.key] ?? 0 : null;
            return (
              <div
                key={t.key}
                className="p-3 bg-gray-50/70 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-600 text-xs shrink-0 mt-0.5">
                  <i className={`fas ${t.icon}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{t.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {loadingStats ? '...' : (count ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Excel / CSV Reports Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-file-excel text-emerald-600"></i>
            Business Excel / CSV Export Reports
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Download filtered operational reports formatted for Microsoft Excel, Google Sheets, or business accounting reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exportCards.map((card) => {
            const count = stats ? (stats as any)[card.countKey] ?? null : null;
            return (
              <div
                key={card.title}
                className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center text-xs">
                      <i className={`fas ${card.icon}`}></i>
                    </div>
                    {count !== null && (
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {count} records
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{card.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-normal line-clamp-2">{card.desc}</p>
                </div>

                <button
                  onClick={() => handleExport(card.endpoint, card.title)}
                  disabled={downloading === card.title}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                >
                  <i className={`fas ${downloading === card.title ? 'fa-spinner fa-spin' : 'fa-file-arrow-down'}`}></i>
                  <span>Download Excel / CSV</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
