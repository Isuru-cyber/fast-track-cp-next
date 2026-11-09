'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

interface Props {
  initialModule: string;
  initialCategory?: string;
  userRole: string;
  dynamicCategories: Record<string, string[]>;
}

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  SHIPMENT: [
    'CUSTOMER_NAME',
    'PAYMENT_TYPE',
    'PACKAGE_TYPE',
    'HS_CODE',
    'SHIPMENT_MODE',
    'INCOTERM',
    'DEL_FROM',
    'DEL_TO',
    'PORT',
    'CHA',
    'FORWARDER_TYPE',
    'FORWARDER',
    'PAYMENT_STATUS',
  ],
  LC: ['CUSTOMER_NAME'],
  UPCOMING: ['CUSTOMER_NAME', 'SHIPMENT_MODE', 'CONTAINER_TYPE'],
};

const SYNC_CATEGORIES = ['CUSTOMER_NAME'];

export default function MasterDataManager({
  initialModule,
  initialCategory,
  userRole,
  dynamicCategories,
}: Props) {
  const { showToast } = useToast();
  const [activeModule, setActiveModule] = useState(initialModule || 'SHIPMENT');
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'CUSTOMER_NAME');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: number | null;
    category: string;
    value: string;
    isSync: boolean;
  }>({
    open: false,
    id: null,
    category: '',
    value: '',
    isSync: false,
  });

  // Calculate merged categories
  const modCategories = Array.from(
    new Set([
      ...(DEFAULT_CATEGORIES[activeModule] || []),
      ...(dynamicCategories[activeModule] || []),
    ])
  );

  useEffect(() => {
    if (!modCategories.includes(activeCategory)) {
      setActiveCategory(modCategories[0] || 'CUSTOMER_NAME');
    }
  }, [activeModule]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/master-data?module=${activeModule}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      showToast('Failed to load master data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeModule]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          category: activeCategory,
          value: newValue.trim(),
          module: activeModule,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Failed to add option', 'error');
      } else {
        showToast(result.message || 'Option added successfully', 'success');
        setNewValue('');
        fetchData();
      }
    } catch {
      showToast('Network error while adding option', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id && !deleteModal.isSync) return;

    try {
      const payload: any = {
        action: deleteModal.isSync ? 'delete_sync' : 'delete',
        id: deleteModal.id,
        category: deleteModal.category,
        value: deleteModal.value,
        module: activeModule,
      };

      const res = await fetch('/api/admin/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Failed to delete option', 'error');
      } else {
        showToast(result.message || 'Option deleted successfully', 'success');
        setDeleteModal({ open: false, id: null, category: '', value: '', isSync: false });
        fetchData();
      }
    } catch {
      showToast('Error deleting option', 'error');
    }
  };

  const currentOptions = data.filter((d) => d.category === activeCategory);

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
      {/* Module Tabs */}
      <div className="flex border-b border-gray-200 shrink-0 bg-white rounded-t-xl px-4">
        {[
          { key: 'SHIPMENT', label: 'Shipment Master Data' },
          { key: 'LC', label: 'LC Master Data' },
          { key: 'UPCOMING', label: 'Upcoming Master Data' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveModule(m.key)}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeModule === m.key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-100 font-bold text-gray-800 bg-white text-lg">
            Categories
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {modCategories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  c === activeCategory
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {c.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <h3 className="text-lg font-bold text-gray-800">
              {activeCategory.replace(/_/g, ' ')} Options
            </h3>
          </div>

          <div className="p-6 border-b border-gray-100 bg-gray-50/30 shrink-0">
            <form onSubmit={handleAdd} className="flex gap-4 max-w-md">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
                placeholder="Enter new option..."
                className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm bg-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <i className="fas fa-plus"></i> Add
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-12">
                <i className="fas fa-circle-notch fa-spin text-indigo-600 text-3xl"></i>
              </div>
            ) : currentOptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No options available for this category.</p>
            ) : (
              <ul className="space-y-3 max-w-md">
                {currentOptions.map((item) => {
                  const isSync = SYNC_CATEGORIES.includes(item.category);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <span className="text-gray-800 font-medium">{item.value}</span>
                      {userRole === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteModal({
                              open: true,
                              id: item.id,
                              category: item.category,
                              value: item.value,
                              isSync,
                            })
                          }
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <i className="fas fa-trash w-4 h-4"></i>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i> Warning
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              {deleteModal.isSync ? (
                <>
                  You are about to delete <strong>{deleteModal.value}</strong>.
                  <br />
                  <br />
                  <span className="text-red-600 font-bold">
                    WARNING: This is a shared category! Deleting it will remove it from Shipment, LC,
                    AND Upcoming master data.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteModal.value}</strong> from this
                  module?
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({ open: false, id: null, category: '', value: '', isSync: false })
                }
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
