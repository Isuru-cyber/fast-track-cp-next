'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';

interface PaymentItem {
  id: number;
  lc_no?: string;
  tt_no?: string;
  customer_name?: string;
  bank_name?: string;
  proforma_invoice?: string;
  original_value: number;
  issue_date?: string;
  expiry_date?: string;
  status: string;
  notes?: string;
  used_amount: number;
  balance: number;
}

interface PaymentOptManagerProps {
  type: 'LC' | 'TT';
  initialItems: PaymentItem[];
  customers: string[];
  isAdmin: boolean;
  search: string;
  statusFilter: string;
}

export default function PaymentOptManager({
  type,
  initialItems,
  customers,
  isAdmin,
  search: initialSearch,
  statusFilter: initialStatusFilter,
}: PaymentOptManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [items, setItems] = useState<PaymentItem[]>(initialItems);
  const [search, setSearch] = useState(initialSearch || '');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'Active');

  // Pagination state - Default 200 lines per page
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; refNo: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    setItems(initialItems);
    setCurrentPage(1);
  }, [initialItems]);

  React.useEffect(() => {
    setSearch(initialSearch || '');
    setStatusFilter(initialStatusFilter || 'Active');
    setCurrentPage(1);
  }, [initialSearch, initialStatusFilter]);

  const totalRecords = items.length;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  // Add / Edit Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentItem | null>(null);

  const [formRefNo, setFormRefNo] = useState('');
  const [formCust, setFormCust] = useState('');
  const [formBank, setFormBank] = useState('');
  const [formPi, setFormPi] = useState('');
  const [formOrigVal, setFormOrigVal] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formNotes, setFormNotes] = useState('');

  // Linked Shipments Side Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<PaymentItem | null>(null);
  const [linkedShipments, setLinkedShipments] = useState<any[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  const isLC = type === 'LC';
  const label = isLC ? 'LC' : 'TT';
  const apiEndpoint = isLC ? '/api/lc' : '/api/tt';

  const resetForm = () => {
    setFormRefNo('');
    setFormCust('');
    setFormBank('');
    setFormPi('');
    setFormOrigVal('');
    setFormIssueDate('');
    setFormExpiryDate('');
    setFormStatus('Active');
    setFormNotes('');
    setEditingItem(null);
    setShowAddForm(false);
  };

  const startEdit = (item: PaymentItem) => {
    setEditingItem(item);
    setFormRefNo(item.lc_no || item.tt_no || '');
    setFormCust(item.customer_name || '');
    setFormBank(item.bank_name || '');
    setFormPi(item.proforma_invoice || '');
    setFormOrigVal(String(item.original_value));
    setFormIssueDate(item.issue_date ? new Date(item.issue_date).toISOString().split('T')[0] : '');
    setFormExpiryDate(item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '');
    setFormStatus(item.status);
    setFormNotes(item.notes || '');
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      [isLC ? 'lc_no' : 'tt_no']: formRefNo.trim(),
      customer_name: formCust,
      bank_name: formBank,
      proforma_invoice: formPi,
      original_value: formOrigVal,
      issue_date: formIssueDate || null,
      expiry_date: formExpiryDate || null,
      status: formStatus,
      notes: formNotes,
    };

    try {
      if (editingItem) {
        const res = await fetch(`${apiEndpoint}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`${label} updated successfully.`);
          resetForm();
          router.refresh();
        } else {
          showToast(data.error || `Failed to update ${label}`, 'error');
        }
      } else {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`${label} registered successfully.`);
          resetForm();
          router.refresh();
        } else {
          showToast(data.error || `Failed to register ${label}`, 'error');
        }
      }
    } catch {
      showToast('An error occurred.', 'error');
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${apiEndpoint}/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`${label} deleted successfully.`);
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete.', 'error');
      }
    } catch {
      showToast('Failed to delete.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openLinkedShipments = async (item: PaymentItem) => {
    setSelectedDrawerItem(item);
    setDrawerOpen(true);
    setLinkedLoading(true);

    try {
      const res = await fetch(`${apiEndpoint}/${item.id}`);
      const data = await res.json();
      setLinkedShipments(data.shipments || []);
    } catch {
      showToast('Failed to load linked shipments.', 'error');
    } finally {
      setLinkedLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = search.trim();
    if (trimmed) params.set('search', trimmed);
    const effStatus = statusFilter || 'all';
    params.set('status_filter', effStatus);

    try {
      localStorage.setItem(
        `fasttrack_filter_${type.toLowerCase()}`,
        JSON.stringify({ search: trimmed, statusFilter: effStatus })
      );
    } catch (err) {
      console.error(err);
    }

    router.push(`/payment-options/${type.toLowerCase()}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    try {
      localStorage.removeItem(`fasttrack_filter_${type.toLowerCase()}`);
    } catch (err) {
      console.error(err);
    }
    setSearch('');
    setStatusFilter('all');
    router.push(`/payment-options/${type.toLowerCase()}?status_filter=all`);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        <Link
          href="/payment-options/lc"
          className={`px-6 py-3 font-medium text-sm ${
            isLC
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          LC Details
        </Link>
        <Link
          href="/payment-options/tt"
          className={`px-6 py-3 font-medium text-sm ${
            !isLC
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          TT Details
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <form onSubmit={handleFilter} className="relative w-full md:w-auto flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label}, Customer, PI...`}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
            />
          </div>

          <select
            value={statusFilter || 'Active'}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
          >
            <option value="Active">Active</option>
            <option value="all">All Statuses</option>
            <option value="Closed">Closed</option>
            <option value="Expired">Expired</option>
          </select>

          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Apply
          </button>

          {(search.trim() || statusFilter !== 'Active') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </form>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`/api/export/${type.toLowerCase()}?search=${encodeURIComponent(search)}&status_filter=${encodeURIComponent(statusFilter)}`}
            download
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <i className="fas fa-download"></i> Export CSV
          </a>

          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <i className="fas fa-plus"></i> Register New {label}
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Popup Window Modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl xl:max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <i className={`fas ${editingItem ? 'fa-edit text-indigo-600' : 'fa-plus-circle text-indigo-600'}`}></i>
                {editingItem ? `Edit ${label} (${formRefNo})` : `Register New ${isLC ? 'Letter of Credit (LC)' : 'Telegraphic Transfer (TT)'}`}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label} No *</label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingItem)}
                      value={formRefNo}
                      onChange={(e) => setFormRefNo(e.target.value)}
                      className={`w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50 ${
                        editingItem ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <select
                      value={formCust}
                      onChange={(e) => setFormCust(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formBank}
                      onChange={(e) => setFormBank(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proforma Invoice</label>
                    <input
                      type="text"
                      value={formPi}
                      onChange={(e) => setFormPi(e.target.value)}
                      placeholder="PI Number"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Original Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formOrigVal}
                      onChange={(e) => setFormOrigVal(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={formIssueDate}
                      onChange={(e) => setFormIssueDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    >
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Add any relevant notes or terms..."
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-save"></i>
                  {editingItem ? 'Update Details' : `Save & Register ${label}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-center border-collapse min-w-max relative">
            <thead className="sticky top-0 bg-gray-100 z-30 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="sticky top-0 left-0 z-40 bg-[#f3f4f6] p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap border-r border-gray-200 text-center w-28 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                  Actions
                </th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[120px] max-w-[150px] bg-gray-100">{label} No</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[140px] max-w-[200px] bg-gray-100">Customer Name</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[130px] max-w-[180px] bg-gray-100">Bank Name</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[130px] max-w-[180px] bg-gray-100">PI Number</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[120px] bg-gray-100">Original Value</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[120px] bg-gray-100">Utilized Value</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[120px] bg-gray-100">Balance</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[100px] bg-gray-100">Issue Date</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[100px] bg-gray-100">Expiry Date</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[90px] bg-gray-100">Status</th>
                <th className="sticky top-0 z-30 p-3 px-4 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap min-w-[130px] max-w-[220px] bg-gray-100">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {totalRecords === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-500">
                    No {label} records found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const refNo = item.lc_no || item.tt_no || '';
                  const isNegative = item.balance <= 0;

                  const statusClass =
                    item.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : item.status === 'Expired'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 p-3 px-4 whitespace-nowrap border-r border-gray-200 text-center shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openLinkedShipments(item)}
                            title="View Linked Shipments"
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded cursor-pointer"
                          >
                            <i className="fas fa-eye w-4 h-4"></i>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                title="Edit"
                                className="text-gray-600 hover:bg-gray-100 p-1.5 rounded cursor-pointer"
                              >
                                <i className="fas fa-edit w-4 h-4"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id: item.id, refNo })}
                                title="Delete"
                                className="text-red-600 hover:bg-red-50 p-1.5 rounded cursor-pointer"
                              >
                                <i className="fas fa-trash w-4 h-4"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm font-medium text-blue-600 max-w-[150px] truncate" title={refNo}>
                        {refNo}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-900 max-w-[200px] truncate" title={item.customer_name || ''}>
                        {item.customer_name || '-'}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-900 max-w-[180px] truncate" title={item.bank_name || ''}>
                        {item.bank_name || '-'}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-900 max-w-[180px] truncate font-mono text-xs" title={item.proforma_invoice || ''}>
                        {item.proforma_invoice || '-'}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ${item.original_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.used_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`p-3 px-4 whitespace-nowrap text-sm font-bold ${
                          isNegative ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-500">
                        {item.issue_date ? new Date(item.issue_date).toISOString().split('T')[0] : '-'}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-500">
                        {item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '-'}
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 px-4 whitespace-nowrap text-sm text-gray-500 max-w-[220px] truncate" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
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

      {/* Slide-over Side Drawer */}
      {drawerOpen && selectedDrawerItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex pl-10">
            <div className="w-full bg-white shadow-2xl flex flex-col h-full transform transition-all duration-300 ease-in-out">
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedDrawerItem.lc_no || selectedDrawerItem.tt_no}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        selectedDrawerItem.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : selectedDrawerItem.status === 'Expired'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedDrawerItem.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedDrawerItem.customer_name || 'No Customer Specified'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Close (Esc)"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="overflow-y-auto custom-scrollbar p-6 space-y-6 flex-1">
                {/* General Information Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <i className="fas fa-info-circle text-indigo-500"></i> General Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">{label} Number</span>
                      <span className="font-bold text-indigo-600">
                        {selectedDrawerItem.lc_no || selectedDrawerItem.tt_no}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">Proforma Invoice</span>
                      <span className="font-semibold text-gray-800 break-words block">
                        {selectedDrawerItem.proforma_invoice || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">Customer</span>
                      <span className="font-medium text-gray-800">
                        {selectedDrawerItem.customer_name || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">Bank Name</span>
                      <span className="font-medium text-gray-800">
                        {selectedDrawerItem.bank_name || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">Issue Date</span>
                      <span className="font-medium text-gray-800">
                        {selectedDrawerItem.issue_date
                          ? new Date(selectedDrawerItem.issue_date).toISOString().split('T')[0]
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-medium">Expiry Date</span>
                      <span className="font-medium text-gray-800">
                        {selectedDrawerItem.expiry_date
                          ? new Date(selectedDrawerItem.expiry_date).toISOString().split('T')[0]
                          : '-'}
                      </span>
                    </div>
                  </div>
                  {selectedDrawerItem.notes && (
                    <div className="pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                      <span className="block text-xs text-gray-400 font-medium mb-1">Notes</span>
                      <p className="bg-white p-2.5 rounded border border-gray-200 text-xs text-gray-700">
                        {selectedDrawerItem.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financial Summary Card */}
                {(() => {
                  const orig = Number(selectedDrawerItem.original_value) || 0;
                  const used = Number(selectedDrawerItem.used_amount) || 0;
                  const bal = Number(selectedDrawerItem.balance) || 0;
                  const pct = orig > 0 ? Math.min(100, Math.round((used / orig) * 100)) : 0;
                  const isNegative = bal <= 0;

                  return (
                    <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-xl p-4 border border-indigo-100/80 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <i className="fas fa-chart-pie text-indigo-500"></i> Utilization & Balance
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                          <span className="block text-[11px] text-gray-500 font-medium">Original Value</span>
                          <span className="text-sm font-bold text-gray-900">
                            ${orig.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                          <span className="block text-[11px] text-gray-500 font-medium">Used Value</span>
                          <span className="text-sm font-bold text-gray-900">
                            ${used.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                          <span className="block text-[11px] text-gray-500 font-medium">Balance</span>
                          <span className={`text-sm font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            ${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                          <span>Utilization</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Associated Shipments Section */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-ship text-indigo-600"></i> Associated Shipments
                  </h4>
                  {linkedLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-spinner fa-spin text-2xl mb-2 text-indigo-500"></i>
                      <p className="text-xs">Loading linked shipments...</p>
                    </div>
                  ) : linkedShipments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 italic text-sm">
                      No shipments drawn under this {label}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {linkedShipments.map((s) => {
                        const totalVal = s.invoices.reduce(
                          (a: number, b: any) => a + Number(b.shipmentValue || 0),
                          0
                        );
                        const invNos = s.invoices.map((i: any) => i.invoiceNo).join(', ');

                        return (
                          <div
                            key={s.id}
                            className="bg-white p-3.5 border border-gray-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Link
                                href={`/shipments/${s.id}`}
                                className="font-bold text-indigo-600 hover:underline text-sm flex items-center gap-1.5"
                              >
                                {s.refNumber} <i className="fas fa-external-link-alt text-[10px]"></i>
                              </Link>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  s.delStatus === 'Delivered'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {s.delStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div>
                                <span className="text-gray-400">Booking: </span>
                                {new Date(s.bookingDate).toISOString().split('T')[0]}
                              </div>
                              <div>
                                <span className="text-gray-400">BL/AWB: </span>
                                {s.blAwb || '-'}
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-400">Invoices: </span>
                                {invNos || '-'}
                              </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                              <span className="text-gray-500">Invoice Total:</span>
                              <span className="text-gray-900">
                                ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={`Delete ${label}`}
        message={`Are you sure you want to delete ${label} "${deleteTarget?.refNo}"? This action cannot be undone.`}
        confirmLabel={`Delete ${label}`}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
