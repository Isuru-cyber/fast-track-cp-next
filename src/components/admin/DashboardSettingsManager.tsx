'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import Sortable from 'sortablejs';

interface CustomField {
  fieldKey: string;
  label: string;
}

interface Props {
  customFields: CustomField[];
}

export default function DashboardSettingsManager({ customFields }: Props) {
  const { showToast } = useToast();
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Chart modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState('chart_bar');
  const [addDataColumn, setAddDataColumn] = useState('customer_name');
  const [addMetric, setAddMetric] = useState('count');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const sortableInstance = useRef<Sortable | null>(null);

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard-settings');
      if (res.ok) {
        const data = await res.json();
        setWidgets(data);
      }
    } catch {
      showToast('Failed to load dashboard settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  // SortableJS initialization
  useEffect(() => {
    if (tableBodyRef.current) {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
      }

      sortableInstance.current = Sortable.create(tableBodyRef.current, {
        handle: '.handle',
        animation: 150,
        ghostClass: 'bg-indigo-50',
        onEnd: async () => {
          if (!tableBodyRef.current) return;
          const rows = tableBodyRef.current.querySelectorAll('tr[data-id]');
          const orderIds = Array.from(rows).map((r) => r.getAttribute('data-id'));

          try {
            const res = await fetch('/api/admin/dashboard-settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reorder', orderIds }),
            });
            if (res.ok) {
              showToast('Widget layout order saved!', 'success');
            } else {
              showToast('Failed to save layout order', 'error');
              fetchWidgets();
            }
          } catch {
            showToast('Error saving widget order', 'error');
            fetchWidgets();
          }
        },
      });
    }

    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [widgets]);

  const updateWidget = async (id: number, field: string, value: any) => {
    try {
      const res = await fetch('/api/admin/dashboard-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_field', id, field, value }),
      });
      if (res.ok) {
        showToast('Widget setting updated', 'success');
        setWidgets((prev) =>
          prev.map((w) => {
            if (w.id === id) {
              if (field === 'width') return { ...w, width: value };
              if (field === 'height') return { ...w, height: value };
              if (field === 'is_visible') return { ...w, isVisible: Boolean(value) };
            }
            return w;
          })
        );
      } else {
        showToast('Failed to update setting', 'error');
      }
    } catch {
      showToast('Network error while updating setting', 'error');
    }
  };

  const handleAddCustomChart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) return;

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/admin/dashboard-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: addTitle.trim(),
          type: addType,
          data_column: addDataColumn,
          metric: addMetric,
        }),
      });

      if (res.ok) {
        showToast('Custom chart created successfully', 'success');
        setShowAddModal(false);
        setAddTitle('');
        setAddType('chart_bar');
        setAddDataColumn('customer_name');
        setAddMetric('count');
        fetchWidgets();
      } else {
        showToast('Failed to create chart', 'error');
      }
    } catch {
      showToast('Error creating custom chart', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all dashboard settings to their default layout? This will delete any custom widgets you have added.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/dashboard-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        showToast('Dashboard reset to default layout', 'success');
        fetchWidgets();
      } else {
        showToast('Failed to reset dashboard', 'error');
      }
    } catch {
      showToast('Error resetting dashboard', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Customize the layout, visibility, and size of dashboard widgets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-undo"></i> Reset to Default
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Add Custom Chart
          </button>
          <Link
            href="/dashboard"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-eye"></i> View Dashboard
          </Link>
        </div>
      </div>

      {/* Add Widget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Add Custom Chart</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddCustomChart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. Volume by Port"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="chart_bar">Bar Chart</option>
                  <option value="chart_pie">Pie Chart</option>
                  <option value="chart_doughnut">Doughnut Chart</option>
                  <option value="list">Leaderboard List</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Source Column
                </label>
                <select
                  value={addDataColumn}
                  onChange={(e) => setAddDataColumn(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <optgroup label="Core Fields">
                    <option value="customer_name">Customer Name</option>
                    <option value="del_from">Delivery From</option>
                    <option value="del_to">Delivery To</option>
                    <option value="port">Port</option>
                    <option value="cha">CHA</option>
                    <option value="forwarder">Forwarder</option>
                    <option value="incoterm">Incoterm</option>
                    <option value="shipment_mode">Shipment Mode</option>
                    <option value="payment_type">Payment Type</option>
                    <option value="payment_status">Payment Status</option>
                    <option value="del_status">Delivery Status</option>
                  </optgroup>
                  {customFields.length > 0 && (
                    <optgroup label="Custom Fields">
                      {customFields.map((f) => (
                        <option key={f.fieldKey} value={f.fieldKey}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric (Y-Axis)
                </label>
                <select
                  value={addMetric}
                  onChange={(e) => setAddMetric(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="count">Count of Shipments</option>
                  <option value="value">Sum of Invoice Value</option>
                  <option value="qty">Sum of Qty</option>
                  <option value="cbm">Sum of CBM</option>
                </select>
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Widgets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Widget Name</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Type</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Width</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Height</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-center">Visible</th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef} className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i>
                  </td>
                </tr>
              ) : widgets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No widgets configured.
                  </td>
                </tr>
              ) : (
                widgets.map((w) => {
                  const isHeightDisabled =
                    w.type === 'kpi' || w.type === 'strip' || w.type === 'list';
                  return (
                    <tr
                      key={w.id}
                      data-id={w.id}
                      className="hover:bg-gray-50 transition-colors bg-white"
                    >
                      <td className="p-3 cursor-move text-gray-400 hover:text-gray-600 handle">
                        <i className="fas fa-grip-vertical"></i>
                      </td>
                      <td className="p-3 font-medium text-gray-900 text-sm">{w.title}</td>
                      <td className="p-3 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                        {w.type}
                      </td>
                      <td className="p-3">
                        <select
                          value={w.width}
                          onChange={(e) => updateWidget(w.id, 'width', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="col-span-12">Full Width (1/1)</option>
                          <option value="col-span-12 lg:col-span-6">Half Width (1/2)</option>
                          <option value="col-span-12 lg:col-span-4">One Third (1/3)</option>
                          <option value="col-span-12 lg:col-span-3">One Fourth (1/4)</option>
                          <option value="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-2">
                            One Sixth (KPI)
                          </option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={w.height}
                          disabled={isHeightDisabled}
                          onChange={(e) => updateWidget(w.id, 'height', e.target.value)}
                          className={`w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
                            isHeightDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="auto">Auto</option>
                          <option value="h-64">Small (256px)</option>
                          <option value="h-72">Medium (288px)</option>
                          <option value="h-80">Large (320px)</option>
                          <option value="h-96">Extra Large (384px)</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={w.isVisible}
                            onChange={(e) =>
                              updateWidget(w.id, 'is_visible', e.target.checked ? 1 : 0)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
