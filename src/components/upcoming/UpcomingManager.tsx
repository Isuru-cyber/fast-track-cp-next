'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MODERN_PALETTE, PRIMARY_BRAND_COLOR } from '@/lib/chart-colors';
import ConfirmModal from '@/components/common/ConfirmModal';

Chart.register(...registerables, ChartDataLabels);

interface UpcomingManagerProps {
  upcoming: any[];
  fieldConfigs: any[];
  isAdmin: boolean;
}

export default function UpcomingManager({ upcoming: initialUpcoming, fieldConfigs, isAdmin }: UpcomingManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [upcoming, setUpcoming] = useState<any[]>(initialUpcoming);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Custom confirm modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    action: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    setUpcoming(initialUpcoming);
  }, [initialUpcoming]);

  // Analysis Stats
  const totalCount = upcoming.length;
  const totalQty = upcoming.reduce((a, b) => a + Number(b.approxQty || 0), 0);
  const totalCbm = upcoming.reduce((a, b) => a + Number(b.cbm || 0), 0);

  // Chart Canvas Refs
  const customerChartRef = useRef<HTMLCanvasElement | null>(null);
  const modeChartRef = useRef<HTMLCanvasElement | null>(null);
  const containerChartRef = useRef<HTMLCanvasElement | null>(null);

  const customerChartInstance = useRef<Chart | null>(null);
  const modeChartInstance = useRef<Chart | null>(null);
  const containerChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!showAnalysis) return;

    // Customer Stats
    const custMap: Record<string, number> = {};
    const modeMap: Record<string, number> = {};
    const contMap: Record<string, number> = {};

    upcoming.forEach((u) => {
      const c = u.customerName || 'Unknown';
      const m = u.shipmentMode || 'Unknown';
      const t = u.containerType || 'Unknown';

      custMap[c] = (custMap[c] || 0) + 1;
      modeMap[m] = (modeMap[m] || 0) + 1;
      contMap[t] = (contMap[t] || 0) + 1;
    });

    const sortedCusts = Object.entries(custMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const colors = MODERN_PALETTE;

    // Render Customer Chart
    if (customerChartRef.current) {
      if (customerChartInstance.current) customerChartInstance.current.destroy();
      customerChartInstance.current = new Chart(customerChartRef.current, {
        type: 'bar',
        data: {
          labels: sortedCusts.map(([k]) => k),
          datasets: [{ data: sortedCusts.map(([, v]) => v), backgroundColor: PRIMARY_BRAND_COLOR, borderRadius: 4 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, datalabels: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
        },
      });
    }

    // Render Mode Chart
    if (modeChartRef.current) {
      if (modeChartInstance.current) modeChartInstance.current.destroy();
      modeChartInstance.current = new Chart(modeChartRef.current, {
        type: 'doughnut',
        data: {
          labels: Object.keys(modeMap),
          datasets: [{ data: Object.values(modeMap), backgroundColor: colors }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' }, datalabels: { display: false } },
        },
      });
    }

    // Render Container Chart
    if (containerChartRef.current) {
      if (containerChartInstance.current) containerChartInstance.current.destroy();
      containerChartInstance.current = new Chart(containerChartRef.current, {
        type: 'pie',
        data: {
          labels: Object.keys(contMap),
          datasets: [{ data: Object.values(contMap), backgroundColor: colors }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' }, datalabels: { display: false } },
        },
      });
    }

    return () => {
      if (customerChartInstance.current) customerChartInstance.current.destroy();
      if (modeChartInstance.current) modeChartInstance.current.destroy();
      if (containerChartInstance.current) containerChartInstance.current.destroy();
    };
  }, [showAnalysis, upcoming]);

  const handleMarkComplete = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Mark Complete',
      message: 'Are you sure you want to mark this upcoming shipment as completed?',
      confirmLabel: 'Mark Complete',
      variant: 'warning',
      action: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/upcoming/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete' }),
          });
          if (res.ok) {
            showToast('Shipment marked as complete.');
            setUpcoming((prev) => prev.filter((u) => u.id !== id));
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          } else {
            showToast('Failed to update.', 'error');
          }
        } catch {
          showToast('An error occurred.', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Upcoming Shipment',
      message: 'Are you sure you want to permanently delete this upcoming shipment?',
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/upcoming/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Upcoming shipment deleted.');
            setUpcoming((prev) => prev.filter((u) => u.id !== id));
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          } else {
            showToast('Failed to delete.', 'error');
          }
        } catch {
          showToast('An error occurred.', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Upcoming Shipments Forecast</h2>
          <p className="text-sm text-gray-500 mt-1">Short-term planning and demand forecasting</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAnalysis((prev) => !prev)}
            className="bg-purple-50 text-purple-600 border border-purple-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <i className="fas fa-chart-line"></i> Analysis
          </button>
          <a
            href="/api/export/upcoming"
            className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <i className="fas fa-file-excel"></i> Export
          </a>
          <Link
            href="/upcoming/new"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <i className="fas fa-plus"></i> Add Upcoming
          </Link>
        </div>
      </div>

      {/* Collapsible Analysis Section */}
      {showAnalysis && (
        <div className="flex flex-col gap-8 flex-shrink-0 mb-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
                <i className="fas fa-list-ol"></i>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Count</p>
                <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl shrink-0">
                <i className="fas fa-boxes"></i>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Approx Qty</p>
                <p className="text-2xl font-bold text-gray-800">{totalQty.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0">
                <i className="fas fa-cube"></i>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total CBM</p>
                <p className="text-2xl font-bold text-gray-800">{totalCbm.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Top 10 Customers</h3>
              <div className="h-64 relative w-full flex justify-center">
                <canvas ref={customerChartRef}></canvas>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
              <h3 className="text-lg font-bold text-gray-800 mb-4">By Shipment Mode</h3>
              <div className="h-64 relative w-full flex justify-center">
                <canvas ref={modeChartRef}></canvas>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
              <h3 className="text-lg font-bold text-gray-800 mb-4">By Container Type</h3>
              <div className="h-64 relative w-full flex justify-center">
                <canvas ref={containerChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending To-Do List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative min-h-[400px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-800">Pending To-Do List</h3>
        </div>

        <div className="overflow-x-auto flex-1 custom-scrollbar pb-16">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                {fieldConfigs.map((fc) => (
                  <th
                    key={fc.id}
                    className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200/50 last:border-r-0"
                  >
                    {fc.label}
                  </th>
                ))}
                <th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 border-l border-gray-200/50 shadow-sm z-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {upcoming.length === 0 ? (
                <tr>
                  <td colSpan={fieldConfigs.length + 1} className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <i className="fas fa-calendar-check text-4xl text-gray-300 mb-3"></i>
                      <p className="text-base font-medium text-gray-600">No pending shipments.</p>
                      <p className="text-sm mt-1">You&apos;re all caught up!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                upcoming.map((u) => (
                  <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {fieldConfigs.map((fc) => {
                      const val = u[fc.fieldKey] ?? u.customData?.[fc.fieldKey] ?? '';

                      return (
                        <td
                          key={fc.id}
                          className="p-4 text-sm text-gray-800 whitespace-nowrap border-r border-gray-50/50 last:border-r-0"
                        >
                          {fc.type === 'Date' && val ? (
                            new Date(val).toISOString().split('T')[0]
                          ) : (fc.type === 'Decimal' || fc.type === 'Number') && val !== '' ? (
                            Number(val).toFixed(2)
                          ) : fc.fieldKey === 'remarks' ? (
                            <div className="max-w-[250px] truncate" title={val}>
                              {val}
                            </div>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}

                    <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-indigo-50/30 transition-colors border-l border-gray-50/50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.02)] z-10">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/shipments/new?from_upcoming=${u.id}`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                          title="Convert to Actual Shipment"
                        >
                          <i className="fas fa-truck-fast"></i>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(u.id)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Mark Complete"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <Link
                          href={`/upcoming/${u.id}/edit`}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        isLoading={confirmLoading}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
