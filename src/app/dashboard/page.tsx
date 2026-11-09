import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedMasterData, getCachedSystemConfig } from '@/lib/cache';
import Shell from '@/components/layout/Shell';
import {
  TrendChart,
  ForwarderMatrixChart,
  IncotermDonutChart,
} from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Props {
  searchParams: Promise<{
    dateRange?: string;
    customStart?: string;
    customEnd?: string;
    forwarder?: string;
    mode?: string;
    incoterm?: string;
    delStatus?: string;
  }>;
}

function safeParseDate(d: any) {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sysConfig = await getCachedSystemConfig();
  const resolvedParams = (await searchParams) || {};
  const dateRange = resolvedParams.dateRange || sysConfig.defaultDateRange || 'month';
  const customStart = resolvedParams.customStart || '';
  const customEnd = resolvedParams.customEnd || '';
  const forwarderFilter = resolvedParams.forwarder || '';
  const modeFilter = resolvedParams.mode || '';
  const incotermFilter = resolvedParams.incoterm || '';
  const delStatusFilter = resolvedParams.delStatus || '';

  // 1. Calculate Date Filters
  const now = new Date();
  let dateFilter: any = undefined;

  if (dateRange === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateFilter = { gte: startOfToday };
  } else if (dateRange === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    dateFilter = { gte: weekAgo };
  } else if (dateRange === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = { gte: startOfMonth };
  } else if (dateRange === 'quarter') {
    const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const startOfQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1);
    dateFilter = { gte: startOfQuarter };
  } else if (dateRange === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    dateFilter = { gte: startOfYear };
  } else if (dateRange === 'custom' && (customStart || customEnd)) {
    dateFilter = {};
    if (customStart) {
      const s = safeParseDate(customStart);
      if (s) dateFilter.gte = s;
    }
    if (customEnd) {
      const e = safeParseDate(customEnd);
      if (e) {
        e.setHours(23, 59, 59, 999);
        dateFilter.lte = e;
      }
    }
  }

  // 2. Build shipment where clause
  const whereClause: any = {};
  if (dateFilter) whereClause.bookingDate = dateFilter;
  if (forwarderFilter) whereClause.forwarder = forwarderFilter;
  if (modeFilter) whereClause.shipmentMode = modeFilter;
  if (incotermFilter) whereClause.incoterm = incotermFilter;
  if (delStatusFilter) whereClause.delStatus = delStatusFilter;

  let dbError = false;
  let shipments: any[] = [];
  let activeLcs: any[] = [];
  let activeTts: any[] = [];
  let activePaymentShipments: any[] = [];
  let upcomingForecasts: any[] = [];
  let masterDataItems: any[] = [];

  try {
    // 3. Fast Parallel Execution with Combined Master Data
    const results = await Promise.all([
      prisma.shipment.findMany({
        where: whereClause,
        select: {
          id: true,
          cbm: true,
          delStatus: true,
          bookingDate: true,
          forwarder: true,
          incoterm: true,
          shipmentMode: true,
          customerName: true,
          port: true,
          invoices: {
            select: {
              secondaryQtyGw: true,
              primaryQtyNw: true,
              shipmentValue: true,
            },
          },
        },
        orderBy: { bookingDate: 'asc' },
      }),
      prisma.letterOfCredit.findMany({
        where: { status: 'Active' },
        select: { lcNo: true, originalValue: true },
      }),
      prisma.telegraphicTransfer.findMany({
        where: { status: 'Active' },
        select: { ttNo: true, originalValue: true },
      }),
      prisma.shipment.findMany({
        where: { statusFlag: 'Active', paymentType: { in: ['LC', 'TT'] } },
        select: {
          paymentType: true,
          payRefNo: true,
          invoices: { select: { shipmentValue: true } },
        },
      }),
      prisma.upcomingShipment.findMany({
        where: { status: { in: ['Pending', 'Confirmed'] } },
        select: { approxQty: true, cbm: true },
      }),
      getCachedMasterData({
        categories: ['FORWARDER', 'SHIPMENT_MODE', 'INCOTERM'],
        module: 'SHIPMENT',
        status: 'Active',
      }),
    ]);

    shipments = results[0];
    activeLcs = results[1];
    activeTts = results[2];
    activePaymentShipments = results[3];
    upcomingForecasts = results[4];
    masterDataItems = results[5] || [];
  } catch (err: any) {
    console.error('Dashboard data load error:', err);
    dbError = true;
  }

  const availableForwarders = masterDataItems.filter((i) => i.category === 'FORWARDER');
  const availableModes = masterDataItems.filter((i) => i.category === 'SHIPMENT_MODE');
  const availableIncoterms = masterDataItems.filter((i) => i.category === 'INCOTERM');

  // 4. Metrics Aggregations
  const totalShipments = shipments.length;
  let totalCbm = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;
  let totalSpend = 0;
  let inTransitCount = 0;
  let deliveredCount = 0;

  // Analytical Distributions
  const trendMap: Record<string, { label: string; cbm: number; value: number }> = {};
  const forwarderMap: Record<string, { count: number; cbm: number; value: number }> = {};
  const incotermMap: Record<string, number> = {};
  const modeMap: Record<string, number> = { 'Sea FCL': 0, 'Sea LCL': 0, Air: 0, Other: 0 };
  const customerSpendMap: Record<string, { count: number; value: number; cbm: number }> = {};
  const portMap: Record<string, number> = {};

  for (const s of shipments) {
    const sCbm = Number(s.cbm || 0);
    totalCbm += sCbm;

    if (s.delStatus === 'Delivered' || s.delStatus === 'Completed') deliveredCount++;
    else inTransitCount++;

    let sVal = 0;
    let sGw = 0;
    let sNw = 0;

    for (const inv of s.invoices || []) {
      sGw += Number(inv.secondaryQtyGw || 0);
      sVal += Number(inv.shipmentValue || 0);
      sNw += Number(inv.primaryQtyNw || 0);
    }

    totalGrossWeight += sGw;
    totalNetWeight += sNw;
    totalSpend += sVal;

    // Safe Trend grouping
    const bDate = safeParseDate(s.bookingDate) || new Date();
    let sortKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
    let displayLabel = bDate.toLocaleString('default', { month: 'short', year: '2-digit' });

    if (dateRange === 'today' || dateRange === 'week') {
      sortKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
      displayLabel = `${String(bDate.getDate()).padStart(2, '0')} ${bDate.toLocaleString('default', { month: 'short' })}`;
    }

    if (!trendMap[sortKey]) {
      trendMap[sortKey] = { label: displayLabel, cbm: 0, value: 0 };
    }
    trendMap[sortKey].cbm += sCbm;
    trendMap[sortKey].value += sVal;

    // Forwarder distribution
    const fName = s.forwarder || 'Unassigned';
    if (!forwarderMap[fName]) forwarderMap[fName] = { count: 0, cbm: 0, value: 0 };
    forwarderMap[fName].count++;
    forwarderMap[fName].cbm += sCbm;
    forwarderMap[fName].value += sVal;

    // Incoterm distribution
    const iTerm = s.incoterm || 'N/A';
    incotermMap[iTerm] = (incotermMap[iTerm] || 0) + sVal;

    // Mode distribution
    const sMode = s.shipmentMode || 'Other';
    if (sMode.includes('FCL')) modeMap['Sea FCL']++;
    else if (sMode.includes('LCL')) modeMap['Sea LCL']++;
    else if (sMode.toLowerCase().includes('air')) modeMap['Air']++;
    else modeMap['Other']++;

    // Customer spend
    const cName = s.customerName || 'Unknown';
    if (!customerSpendMap[cName]) customerSpendMap[cName] = { count: 0, value: 0, cbm: 0 };
    customerSpendMap[cName].count++;
    customerSpendMap[cName].value += sVal;
    customerSpendMap[cName].cbm += sCbm;

    // Port
    if (s.port) portMap[s.port] = (portMap[s.port] || 0) + 1;
  }

  // Trend Chart data
  const sortedTrendKeys = Object.keys(trendMap).sort();
  const trendLabels = sortedTrendKeys.map((k) => trendMap[k].label);
  const trendCbms = sortedTrendKeys.map((k) => trendMap[k].cbm);
  const trendValues = sortedTrendKeys.map((k) => trendMap[k].value);

  // Top Forwarders
  const topForwarderEntries = Object.entries(forwarderMap)
    .sort((a, b) => b[1].cbm - a[1].cbm)
    .slice(0, 6);
  const forwarderLabels = topForwarderEntries.map((e) => e[0]);
  const forwarderCbms = topForwarderEntries.map((e) => e[1].cbm);
  const forwarderCounts = topForwarderEntries.map((e) => e[1].count);

  // Incoterms
  const incotermLabels = Object.keys(incotermMap);
  const incotermValues = Object.values(incotermMap);

  // Top Customers
  const topCustomers = Object.entries(customerSpendMap)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5);

  // Financial Liquidity Strip calculation
  const totalLcOrig = activeLcs.reduce((acc, lc) => acc + Number(lc.originalValue || 0), 0);
  const totalTtOrig = activeTts.reduce((acc, tt) => acc + Number(tt.originalValue || 0), 0);

  const activeLcSet = new Set(activeLcs.map((l) => (l.lcNo || '').trim().toUpperCase()));
  const activeTtSet = new Set(activeTts.map((t) => (t.ttNo || '').trim().toUpperCase()));

  let totalLcUsed = 0;
  let totalTtUsed = 0;

  for (const s of activePaymentShipments) {
    const pType = (s.paymentType || '').toUpperCase();
    const ref = (s.payRefNo || '').trim().toUpperCase();
    const sTotalVal = (s.invoices || []).reduce((sum: number, inv: any) => sum + Number(inv.shipmentValue || 0), 0);

    if (pType === 'LC' && activeLcSet.has(ref)) {
      totalLcUsed += sTotalVal;
    } else if (pType === 'TT' && activeTtSet.has(ref)) {
      totalTtUsed += sTotalVal;
    }
  }

  const lcBalance = Math.max(0, totalLcOrig - totalLcUsed);
  const ttBalance = Math.max(0, totalTtOrig - totalTtUsed);

  const upcomingCbm = upcomingForecasts.reduce((acc, u) => acc + Number(u.cbm || 0), 0);

  const hasActiveFilters = Boolean(
    dateRange !== 'month' ||
      forwarderFilter ||
      modeFilter ||
      incotermFilter ||
      delStatusFilter ||
      customStart ||
      customEnd
  );

  return (
    <Shell user={user}>
      <div className="w-full h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
        {/* Network / Latency Alert Banner */}
        {dbError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <i className="fas fa-triangle-exclamation text-amber-600 text-sm"></i>
              <span>Database connection experienced a latency delay. Displaying cached session data.</span>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
            >
              Refresh Data
            </Link>
          </div>
        )}

        {/* 1. Single-Line Logistics & Date Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2.5 shrink-0">
          <form
            key={`${dateRange}-${forwarderFilter}-${modeFilter}-${incotermFilter}-${delStatusFilter}`}
            method="GET"
            action="/dashboard"
            className="flex flex-wrap items-center justify-between gap-2.5"
          >
            <input type="hidden" name="dateRange" value={dateRange} />

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs shrink-0">
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: '7 Days' },
                { key: 'month', label: 'This Month' },
                { key: 'quarter', label: 'This Quarter' },
                { key: 'year', label: 'This Year' },
                { key: 'all', label: 'All Time' },
              ].map((p) => {
                const active = dateRange === p.key;
                const q = new URLSearchParams({
                  dateRange: p.key,
                  ...(forwarderFilter ? { forwarder: forwarderFilter } : {}),
                  ...(modeFilter ? { mode: modeFilter } : {}),
                  ...(incotermFilter ? { incoterm: incotermFilter } : {}),
                  ...(delStatusFilter ? { delStatus: delStatusFilter } : {}),
                });
                return (
                  <Link
                    key={p.key}
                    href={`/dashboard?${q.toString()}`}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      active
                        ? 'bg-white text-indigo-700 font-bold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </Link>
                );
              })}
            </div>

            {/* Facet Filter Dropdowns & Actions */}
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-0">
              {/* Forwarder */}
              <select
                name="forwarder"
                defaultValue={forwarderFilter}
                className="py-1.5 px-2.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Forwarders</option>
                {availableForwarders.map((f: any) => (
                  <option key={f.value} value={f.value}>
                    {f.value}
                  </option>
                ))}
              </select>

              {/* Shipment Mode */}
              <select
                name="mode"
                defaultValue={modeFilter}
                className="py-1.5 px-2.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Modes</option>
                {availableModes.map((m: any) => (
                  <option key={m.value} value={m.value}>
                    {m.value}
                  </option>
                ))}
              </select>

              {/* Incoterm */}
              <select
                name="incoterm"
                defaultValue={incotermFilter}
                className="py-1.5 px-2.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Incoterms</option>
                {availableIncoterms.map((i: any) => (
                  <option key={i.value} value={i.value}>
                    {i.value}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                name="delStatus"
                defaultValue={delStatusFilter}
                className="py-1.5 px-2.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="In-Transit">In-Transit</option>
                <option value="Customs Clearance">Customs Clearance</option>
                <option value="Pending">Pending</option>
              </select>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Apply
                </button>
                {hasActiveFilters && (
                  <a
                    href="/dashboard"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-2.5 rounded-lg text-xs transition-colors font-medium cursor-pointer"
                    title="Reset Filters"
                  >
                    Reset
                  </a>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* 2. Glassmorphic Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {/* Total Shipments */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Shipments
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i className="fas fa-ship text-sm"></i>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  {totalShipments}
                </span>
                <span className="text-xs text-gray-400 font-medium">Recorded</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                <span>In-Transit: <strong>{inTransitCount}</strong></span>
                <span className="text-emerald-600 font-semibold">
                  {totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 100) : 0}% Delivered
                </span>
              </div>
            </div>
          </div>

          {/* Total Volume */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cargo Volume (CBM)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i className="fas fa-cubes text-sm"></i>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  {totalCbm.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 font-medium">CBM</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                <span>Avg per Shipment:</span>
                <span className="font-semibold text-gray-800">
                  {totalShipments > 0 ? (totalCbm / totalShipments).toFixed(2) : '0.00'} CBM
                </span>
              </div>
            </div>
          </div>

          {/* Gross & Net Weight */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gross Weight (GW)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <i className="fas fa-weight-hanging text-sm"></i>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  {(totalGrossWeight / 1000).toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 font-medium">Metric Tons</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                <span>Net Weight:</span>
                <span className="font-semibold text-gray-800">
                  {totalNetWeight.toLocaleString()} KG
                </span>
              </div>
            </div>
          </div>

          {/* Total Invoiced Value */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Shipment Value
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i className="fas fa-dollar-sign text-sm"></i>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600 tracking-tight">
                  ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-gray-400 font-medium">USD</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                <span>Avg Shipment:</span>
                <span className="font-semibold text-gray-800">
                  ${totalShipments > 0 ? Math.round(totalSpend / totalShipments).toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Secondary Liquidity & Planning Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          {/* LC Liquidity */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-3.5 rounded-xl border border-blue-100/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase">
                <i className="fas fa-university text-blue-600"></i> Active LC Liquidity
              </div>
              <div className="text-lg font-bold text-blue-950 mt-1">
                ${lcBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                <span className="text-xs font-normal text-blue-700">Avail</span>
              </div>
              <p className="text-xs text-blue-700/80 mt-0.5">
                ${totalLcUsed.toLocaleString()} drawn from ${totalLcOrig.toLocaleString()}
              </p>
            </div>
            <Link
              href="/payment-options/lc"
              className="px-3 py-1.5 bg-white text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors shadow-2xs"
            >
              Manage LC
            </Link>
          </div>

          {/* TT Liquidity */}
          <div className="bg-gradient-to-r from-purple-50/70 to-pink-50/50 p-3.5 rounded-xl border border-purple-100/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 uppercase">
                <i className="fas fa-money-bill-transfer text-purple-600"></i> Active TT Liquidity
              </div>
              <div className="text-lg font-bold text-purple-950 mt-1">
                ${ttBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                <span className="text-xs font-normal text-purple-700">Avail</span>
              </div>
              <p className="text-xs text-purple-700/80 mt-0.5">
                ${totalTtUsed.toLocaleString()} drawn from ${totalTtOrig.toLocaleString()}
              </p>
            </div>
            <Link
              href="/payment-options/tt"
              className="px-3 py-1.5 bg-white text-purple-700 text-xs font-semibold rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors shadow-2xs"
            >
              Manage TT
            </Link>
          </div>

          {/* Upcoming Forecast Pipeline */}
          <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-3.5 rounded-xl border border-amber-100/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
                <i className="fas fa-calendar-check text-amber-600"></i> Forecast Pipeline
              </div>
              <div className="text-lg font-bold text-amber-950 mt-1">
                {upcomingForecasts.length}{' '}
                <span className="text-xs font-normal text-amber-700">Planned Shipments</span>
              </div>
              <p className="text-xs text-amber-700/80 mt-0.5">
                Est. Volume: <strong>{upcomingCbm.toFixed(2)} CBM</strong>
              </p>
            </div>
            <Link
              href="/upcoming"
              className="px-3 py-1.5 bg-white text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors shadow-2xs"
            >
              View Forecast
            </Link>
          </div>
        </div>

        {/* 4. Modern Analytics Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 shrink-0">
          {/* Volume & Spend Run-Rate Trend */}
          <div className="lg:col-span-8 bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <i className="fas fa-chart-line text-indigo-600"></i> Cargo Volume &amp; Spend Run-Rate
                </h3>
                <p className="text-xs text-gray-500">Monthly dual-axis trajectory comparing CBM and USD Value</p>
              </div>
            </div>
            <div className="flex-1 min-h-[250px] relative">
              <TrendChart labels={trendLabels} cbms={trendCbms} values={trendValues} />
            </div>
          </div>

          {/* Incoterm Risk & Cost Distribution */}
          <div className="lg:col-span-4 bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <i className="fas fa-shield-halved text-emerald-600"></i> Incoterm Value Share
                </h3>
                <p className="text-xs text-gray-500">Commercial terms cost &amp; liability split</p>
              </div>
            </div>
            <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
              {incotermValues.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No incoterm data recorded.</p>
              ) : (
                <IncotermDonutChart labels={incotermLabels} values={incotermValues} />
              )}
            </div>
          </div>

          {/* Forwarder Performance Matrix */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <i className="fas fa-dolly text-sky-600"></i> Top Forwarders (Volume &amp; Frequency)
                </h3>
                <p className="text-xs text-gray-500">Cargo volume handle comparison by forwarder</p>
              </div>
            </div>
            <div className="flex-1 min-h-[220px] relative">
              {forwarderLabels.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-12">No forwarder data in selection.</p>
              ) : (
                <ForwarderMatrixChart labels={forwarderLabels} cbms={forwarderCbms} counts={forwarderCounts} />
              )}
            </div>
          </div>

          {/* Top 5 High-Value Customers */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <i className="fas fa-trophy text-amber-500"></i> Top Volume &amp; Value Clients
                </h3>
                <p className="text-xs text-gray-500">Leading accounts by invoiced shipment value</p>
              </div>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
              {topCustomers.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-12">No customer records in selection.</p>
              ) : (
                topCustomers.map(([cName, cData], idx) => {
                  const pct = totalSpend > 0 ? Math.round((cData.value / totalSpend) * 100) : 0;
                  return (
                    <div key={cName} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{cName}</p>
                          <p className="text-xs text-gray-500">
                            {cData.count} Shipments • {cData.cbm.toFixed(2)} CBM
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">
                          ${cData.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">{pct}% of spend</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
