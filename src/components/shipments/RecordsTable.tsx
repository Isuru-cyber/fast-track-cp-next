'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';

interface RecordsTableProps {
  initialShipments: any[];
  fieldConfigs: any[];
  deliveryStatusOptions?: string[];
  currentUser: {
    id: number;
    name: string;
    role: 'ADMIN' | 'ENTRY USER' | 'VIEW' | string;
  };
  filters: {
    search: string;
    dateFilter: string;
    startDate: string;
    endDate: string;
    delStatus?: string;
  };
}

export default function RecordsTable({
  initialShipments,
  fieldConfigs,
  deliveryStatusOptions = ['Pending', 'Delivered'],
  currentUser,
  filters,
}: RecordsTableProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [shipments, setShipments] = useState(initialShipments);
  const [search, setSearch] = useState(filters.search);
  const [dateFilter, setDateFilter] = useState(filters.dateFilter);
  const [startDate, setStartDate] = useState(filters.startDate);
  const [endDate, setEndDate] = useState(filters.endDate);
  const [delStatusFilter, setDelStatusFilter] = useState(filters.delStatus || '');
  const [exportMode, setExportMode] = useState('summary');

  // Deletion modal state
  const [deleteShipmentId, setDeleteShipmentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Complete modal state
  const [quickCompleteTarget, setQuickCompleteTarget] = useState<any | null>(null);
  const [isQuickUpdating, setIsQuickUpdating] = useState(false);

  const handleQuickCompleteClick = (shipment: any) => {
    const isCompleted = shipment.delStatus === 'Delivered' || shipment.delStatus === 'Completed';
    if (isCompleted) {
      showToast('Shipment is already completed. To change this status, please open the Edit form.', 'info');
      return;
    }
    setQuickCompleteTarget(shipment);
  };

  const confirmQuickComplete = async () => {
    if (!quickCompleteTarget) return;
    setIsQuickUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${quickCompleteTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quick_complete' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Shipment marked as Completed (Delivered) successfully.');
        setShipments((prev) =>
          prev.map((s) => (s.id === quickCompleteTarget.id ? { ...s, delStatus: 'Delivered' } : s))
        );
        setQuickCompleteTarget(null);
        router.refresh();
      } else {
        showToast(data.error || 'Failed to update status.', 'error');
      }
    } catch {
      showToast('An error occurred while updating status.', 'error');
    } finally {
      setIsQuickUpdating(false);
    }
  };

  // Pagination State - Default 200 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);

  React.useEffect(() => {
    setShipments(initialShipments);
    setCurrentPage(1);
  }, [initialShipments]);

  React.useEffect(() => {
    setSearch(filters.search);
    setDateFilter(filters.dateFilter);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setDelStatusFilter(filters.delStatus || '');
    setCurrentPage(1);
  }, [filters.search, filters.dateFilter, filters.startDate, filters.endDate, filters.delStatus]);

  const totalRecords = shipments.length;
  const paginatedShipments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return shipments.slice(startIndex, startIndex + pageSize);
  }, [shipments, currentPage, pageSize]);

  // Invoice modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRef, setModalRef] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalInvoices, setModalInvoices] = useState<any[]>([]);

  const lineFields = fieldConfigs.filter((f) => f.fieldScope === 'LINE');

  const openInvoiceModal = async (shipmentId: number, refNumber: string) => {
    setModalRef(refNumber);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/invoices`);
      const data = await res.json();
      setModalInvoices(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load invoice lines.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteShipment = async () => {
    if (!deleteShipmentId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/shipments/${deleteShipmentId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Shipment deleted successfully.');
        setShipments((prev) => prev.filter((s) => s.id !== deleteShipmentId));
        setDeleteShipmentId(null);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to delete shipment.', 'error');
      }
    } catch {
      showToast('Failed to delete shipment.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dateFilter) params.set('date_filter', dateFilter);
    if (dateFilter === 'range') {
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
    }
    if (delStatusFilter) params.set('del_status', delStatusFilter);
    router.push(`/shipments?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDateFilter('month');
    setStartDate('');
    setEndDate('');
    setDelStatusFilter('');
    router.push('/shipments');
  };

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('export_mode', exportMode);
    params.set('date_filter', dateFilter);
    if (search) params.set('search', search);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (delStatusFilter) params.set('del_status', delStatusFilter);
    window.location.href = `/api/export/shipments?${params.toString()}`;
  };

  const isEntryOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'ENTRY USER';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 flex-shrink-0 bg-white flex-wrap">
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Ref, Customer..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              />
            </div>

            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
              }}
              className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 text-sm bg-gray-50/50"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="range">Custom Range</option>
            </select>

            {dateFilter === 'range' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50/50"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50/50"
                />
              </div>
            )}

            {/* Delivery Status Filter */}
            <select
              value={delStatusFilter}
              onChange={(e) => setDelStatusFilter(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 text-sm bg-gray-50/50"
            >
              <option value="">All Statuses</option>
              {deliveryStatusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <button type="submit" className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Apply
            </button>

            {(search || dateFilter !== 'month' || delStatusFilter) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <i className="fas fa-times"></i> Clear Filters
              </button>
            )}
          </form>

          {/* Export & New Entry Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            {isEntryOrAdmin && (
              <>
                <form onSubmit={handleExport} className="flex items-center gap-2 m-0">
                  <select
                    value={exportMode}
                    onChange={(e) => setExportMode(e.target.value)}
                    className="p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50/50 focus:ring-indigo-500"
                  >
                    <option value="summary">Summary Export</option>
                    <option value="detailed">Detailed Export</option>
                  </select>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <i className="fas fa-download"></i> <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </form>

                <Link
                  href="/shipments/new"
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i> <span className="hidden sm:inline">New Entry</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Master Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-center border-collapse min-w-max relative">
            <thead className="sticky top-0 bg-gray-100 z-30 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="sticky top-0 left-0 bg-[#f3f4f6] p-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 z-40 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                  Actions
                </th>
                {fieldConfigs.map((f) => (
                  <th
                    key={f.id}
                    className="sticky top-0 p-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-100 z-30"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan={fieldConfigs.length + 1} className="py-12 text-center text-gray-400">
                    <i className="fas fa-inbox text-4xl mb-3 block text-gray-300"></i>
                    No shipments found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((s) => {
                  const cd = (s.customData as any) || {};
                  const invs = s.invoices || [];
                  const isAdmin = currentUser.role === 'ADMIN';
                  const canEdit = isAdmin || (currentUser.role === 'ENTRY USER' && s.createdBy === currentUser.id);
                  const isCompleted = s.delStatus === 'Delivered' || s.delStatus === 'Completed';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Frozen Actions Column */}
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 p-3 px-6 whitespace-nowrap border-r border-gray-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] z-20">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openInvoiceModal(s.id, s.refNumber)}
                            title="View Invoice Lines"
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded border border-transparent hover:border-blue-200 transition-all"
                          >
                            <i className="fas fa-eye w-4 h-4"></i>
                          </button>

                          {/* Quick Status Action (Only for pending, locked once completed) */}
                          {canEdit && (
                            isCompleted ? (
                              <span
                                title="Completed (Locked in Quick Mode - Use Edit to change)"
                                className="text-gray-300 p-1.5 rounded cursor-not-allowed inline-flex items-center justify-center"
                              >
                                <i className="fas fa-check-double w-4 h-4 text-emerald-500/50"></i>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCompleteClick(s)}
                                title="Quick Status: Mark as Completed"
                                className="text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent p-1.5 rounded transition-all cursor-pointer"
                              >
                                <i className="fas fa-circle-check w-4 h-4"></i>
                              </button>
                            )
                          )}

                          {canEdit && (
                            <Link
                              href={`/shipments/${s.id}/edit`}
                              title="Edit"
                              className="text-gray-600 hover:bg-gray-100 p-1.5 rounded"
                            >
                              <i className="fas fa-edit w-4 h-4"></i>
                            </Link>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteShipmentId(s.id)}
                              title="Delete"
                              className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                            >
                              <i className="fas fa-trash w-4 h-4"></i>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Data Columns */}
                      {fieldConfigs.map((f) => {
                        let displayVal = '';

                        if (f.fieldScope === 'LINE') {
                          const isNumeric = ['Number', 'Decimal', 'Currency'].includes(f.type);
                          const vals: any[] = [];
                          for (const inv of invs) {
                            let iv = '';
                            if (f.isCustom) {
                              const icd = (inv.customData as any) || {};
                              iv = icd[f.fieldKey];
                            } else {
                              iv = (inv as any)[f.fieldKey];
                            }
                            if (iv !== null && iv !== undefined && iv !== '') {
                              vals.push(iv);
                            }
                          }

                          if (isNumeric) {
                            const sum = vals.reduce((a, b) => a + Number(b), 0);
                            displayVal = vals.length > 0 ? sum.toFixed(2) : '0.00';
                          } else {
                            if (vals.length > 3) {
                              displayVal = `${vals.slice(0, 3).join(', ')} (+${vals.length - 3} more)`;
                            } else {
                              displayVal = vals.join(', ');
                            }
                          }
                        } else {
                          let val = '';
                          if (f.isCustom) {
                            val = cd[f.fieldKey] ?? '';
                          } else if (f.fieldKey === 'no' && s.no) {
                            val = String(s.no).padStart(4, '0');
                          } else if (f.fieldKey === 'createdByName') {
                            val = s.creator?.name || s.userName || '';
                          } else {
                            val = (s as any)[f.fieldKey] ?? '';
                          }

                          if (f.type === 'Date' && val) {
                            displayVal = new Date(val).toISOString().split('T')[0];
                          } else if ((f.type === 'Decimal' || f.type === 'Currency') && val !== '') {
                            displayVal = Number(val).toFixed(2);
                          } else {
                            displayVal = String(val);
                          }
                        }

                        // Special Badge Styling
                        if (f.fieldKey === 'delStatus' || f.fieldKey === 'paymentStatus') {
                          const isDelStatus = f.fieldKey === 'delStatus';
                          const isGood = ['Delivered', 'Paid', 'Completed'].includes(displayVal);
                          const isPending = displayVal === 'Pending';
                          const bgClass = isGood
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : isPending
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200';

                          return (
                            <td key={f.id} className="p-3 px-6 whitespace-nowrap text-sm text-center">
                              {isDelStatus && isPending && canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickCompleteClick(s)}
                                  title="Quick Status: Click to mark as Completed"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bgClass} hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 transition-all cursor-pointer shadow-xs group/status`}
                                >
                                  <span>{displayVal}</span>
                                  <i className="fas fa-check text-[10px] opacity-70 group-hover/status:opacity-100 text-orange-600 group-hover/status:text-emerald-700"></i>
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgClass}`}
                                  title={isDelStatus && isGood ? 'Completed (Locked in quick mode - Use Edit form to change)' : undefined}
                                >
                                  {isDelStatus && isGood && <i className="fas fa-check-circle text-green-600 text-[11px]"></i>}
                                  <span>{displayVal}</span>
                                </span>
                              )}
                            </td>
                          );
                        }

                        if (f.fieldKey === 'refNumber') {
                          return (
                            <td key={f.id} className="p-3 px-6 whitespace-nowrap text-sm text-blue-600 font-medium text-center">
                              <Link href={`/shipments/${s.id}`} className="hover:underline">
                                {displayVal}
                              </Link>
                            </td>
                          );
                        }

                        if (displayVal.length > 40) {
                          return (
                            <td
                              key={f.id}
                              className="p-3 px-6 whitespace-nowrap text-sm text-gray-900 text-center"
                              title={displayVal}
                            >
                              {displayVal.substring(0, 40)}...
                            </td>
                          );
                        }

                        return (
                          <td key={f.id} className="p-3 px-6 whitespace-nowrap text-sm text-gray-900 text-center">
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Invoice Lines Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl xl:max-w-7xl h-[85vh] max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-file-invoice text-indigo-600"></i> Invoice Lines:{' '}
                <span className="text-indigo-600">{modalRef}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 custom-scrollbar">
              {modalLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-spinner fa-spin text-2xl mb-2 text-indigo-500"></i>
                  <p>Loading invoices...</p>
                </div>
              ) : modalInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">No invoice lines found.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-100 text-gray-600 uppercase tracking-wide text-xs">
                    <tr>
                      <th className="p-3 border-b border-gray-200 font-semibold w-12">#</th>
                      {lineFields.map((lf) => (
                        <th key={lf.id} className="p-3 border-b border-gray-200 font-semibold whitespace-nowrap">
                          {lf.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalInvoices.map((inv, idx) => {
                      const icd = (inv.customData as any) || {};
                      return (
                        <tr key={inv.id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 text-gray-500 font-medium">{idx + 1}</td>
                          {lineFields.map((lf) => {
                            let v = lf.isCustom ? icd[lf.fieldKey] : (inv as any)[lf.fieldKey];
                            if ((lf.type === 'Decimal' || lf.type === 'Currency') && v !== '' && v !== null && v !== undefined) {
                              v = Number(v).toFixed(2);
                            }
                            return (
                              <td key={lf.id} className="p-3 text-gray-800 whitespace-nowrap">
                                {String(v ?? '')}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Shipment Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteShipmentId !== null}
        title="Delete Shipment"
        message="Are you sure you want to permanently delete this shipment and all of its associated invoice records? This action cannot be undone."
        confirmLabel="Delete Shipment"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteShipment}
        onCancel={() => setDeleteShipmentId(null)}
      />

      {/* Quick Complete Confirmation Modal */}
      {quickCompleteTarget && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <i className="fas fa-circle-check text-xl"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Mark as Completed</h3>
                <p className="text-xs text-gray-500">Quick Status Confirmation</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to mark shipment{' '}
              <strong className="text-gray-900">{quickCompleteTarget.refNumber || `ID #${quickCompleteTarget.id}`}</strong>{' '}
              as <strong className="text-emerald-600">Completed (Delivered)</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-5 flex items-start gap-2">
              <i className="fas fa-lock text-amber-600 mt-0.5 shrink-0"></i>
              <span>
                Once marked as Completed, this cannot be reverted via Quick Status. Any further changes will require opening the full Edit form.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuickCompleteTarget(null)}
                disabled={isQuickUpdating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmQuickComplete}
                disabled={isQuickUpdating}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isQuickUpdating ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin text-xs"></i>
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check text-xs"></i>
                    <span>Confirm &amp; Complete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
