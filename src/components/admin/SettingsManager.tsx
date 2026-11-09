'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import Sortable from 'sortablejs';

interface Props {
  initialModule: string;
}

export default function SettingsManager({ initialModule }: Props) {
  const { showToast } = useToast();
  const [activeModule, setActiveModule] = useState(initialModule || 'SHIPMENT');
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add form toggle & state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addType, setAddType] = useState('Text');
  const [addScope, setAddScope] = useState('FIXED');
  const [addCategory, setAddCategory] = useState('');
  const [addRequired, setAddRequired] = useState(false);
  const [addActive, setAddActive] = useState(true);
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    label: string;
    type: string;
    field_scope: string;
    is_required: boolean;
    is_active: boolean;
  }>({
    label: '',
    type: 'Text',
    field_scope: 'FIXED',
    is_required: false,
    is_active: true,
  });

  // Delete check modal
  const [deleteCheck, setDeleteCheck] = useState<{
    open: boolean;
    id: number | null;
    label: string;
    count: number;
  }>({
    open: false,
    id: null,
    label: '',
    count: 0,
  });

  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const sortableInstance = useRef<Sortable | null>(null);

  const hasFilters = Boolean(search || typeFilter || statusFilter !== '');

  const fetchFields = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        module: activeModule,
        search,
        type_filter: typeFilter,
        status_filter: statusFilter,
      });
      const res = await fetch(`/api/admin/settings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [activeModule, search, typeFilter, statusFilter]);

  // SortableJS initialization
  useEffect(() => {
    if (!hasFilters && tableBodyRef.current) {
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
            const res = await fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reorder', orderIds }),
            });
            if (res.ok) {
              showToast('Column order saved!', 'success');
            } else {
              showToast('Failed to save order', 'error');
              fetchFields();
            }
          } catch {
            showToast('Error saving order', 'error');
            fetchFields();
          }
        },
      });
    } else if (sortableInstance.current) {
      sortableInstance.current.destroy();
      sortableInstance.current = null;
    }

    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [hasFilters, fields]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLabel.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          module: activeModule,
          label: addLabel.trim(),
          type: addType,
          field_scope: addScope,
          options_category: addType === 'Dropdown' ? addCategory : undefined,
          is_required: addRequired,
          is_active: addActive,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Failed to add column', 'error');
      } else {
        showToast('Column added successfully', 'success');
        setShowAddForm(false);
        setAddLabel('');
        setAddCategory('');
        setAddType('Text');
        setAddScope('FIXED');
        setAddRequired(false);
        setAddActive(true);
        fetchFields();
      }
    } catch {
      showToast('Error adding column', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', id }),
      });
      if (res.ok) {
        fetchFields();
      } else {
        showToast('Failed to toggle status', 'error');
      }
    } catch {
      showToast('Error updating status', 'error');
    }
  };

  const handleStartEdit = (f: any) => {
    setEditingId(f.id);
    setEditForm({
      label: f.label,
      type: f.type,
      field_scope: f.fieldScope,
      is_required: f.isRequired,
      is_active: f.isActive,
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          id,
          label: editForm.label,
          type: editForm.type,
          field_scope: editForm.field_scope,
          is_required: editForm.is_required,
          is_active: editForm.is_active,
        }),
      });
      if (res.ok) {
        showToast('Column updated successfully', 'success');
        setEditingId(null);
        fetchFields();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update column', 'error');
      }
    } catch {
      showToast('Error updating column', 'error');
    }
  };

  const handleCheckDelete = async (id: number) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_delete', id }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteCheck({
          open: true,
          id: data.id,
          label: data.label,
          count: data.count,
        });
      } else {
        showToast(data.error || 'Failed to check deletion', 'error');
      }
    } catch {
      showToast('Error checking column data', 'error');
    }
  };

  const handleForceDelete = async () => {
    if (!deleteCheck.id) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_delete', id: deleteCheck.id }),
      });
      if (res.ok) {
        showToast('Column deleted successfully', 'success');
        setDeleteCheck({ open: false, id: null, label: '', count: 0 });
        fetchFields();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete column', 'error');
      }
    } catch {
      showToast('Error deleting column', 'error');
    }
  };

  const handleResetToDefault = async () => {
    if (
      !confirm(
        'Are you sure you want to reset System Settings to default? This will hide all custom columns and restore the default visibility and order for this module.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', module: activeModule }),
      });
      if (res.ok) {
        showToast(`Settings for ${activeModule} reset to default`, 'success');
        fetchFields();
      } else {
        showToast('Failed to reset settings', 'error');
      }
    } catch {
      showToast('Error resetting settings', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Module Tabs */}
      <div className="flex border-b border-gray-200 mb-2 bg-white rounded-t-xl px-4">
        {[
          { key: 'SHIPMENT', label: 'Shipment Columns' },
          { key: 'LC', label: 'LC Columns' },
          { key: 'UPCOMING', label: 'Upcoming Columns' },
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

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <div className="relative w-full md:w-auto flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search columns..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
          >
            <option value="">All Types</option>
            <option value="Text">Text</option>
            <option value="Number">Number</option>
            <option value="Decimal">Decimal</option>
            <option value="Date">Date</option>
            <option value="Dropdown">Dropdown</option>
            <option value="Currency">Currency</option>
            <option value="Long Text">Long Text</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
          >
            <option value="">All Statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
              }}
              className="text-gray-600 hover:text-gray-900 font-medium px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm text-sm"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-undo"></i> Reset to Default
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <i className="fas fa-plus"></i> Add Custom Column
          </button>
        </div>
      </div>

      {/* Add Custom Column Popup Window Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <i className="fas fa-plus-circle text-indigo-600"></i>
                Add New Custom Column ({activeModule})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Column Label *
                    </label>
                    <input
                      type="text"
                      required
                      value={addLabel}
                      onChange={(e) => setAddLabel(e.target.value)}
                      placeholder="e.g. Reference No"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    >
                      <option value="Text">Text</option>
                      <option value="Number">Number</option>
                      <option value="Decimal">Decimal</option>
                      <option value="Date">Date</option>
                      <option value="Dropdown">Dropdown</option>
                      <option value="Currency">Currency</option>
                      <option value="Long Text">Long Text</option>
                    </select>
                  </div>
                  {activeModule === 'SHIPMENT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                      <select
                        value={addScope}
                        onChange={(e) => setAddScope(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                      >
                        <option value="FIXED">Fixed (Shipment-level)</option>
                        <option value="LINE">Line-wise (Invoice-level)</option>
                      </select>
                    </div>
                  )}
                  {addType === 'Dropdown' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Master Data Category Name *
                      </label>
                      <input
                        type="text"
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value)}
                        placeholder="e.g. FORWORDER_UPDATE (Leave blank to auto-generate)"
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from column label.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addRequired}
                      onChange={(e) => setAddRequired(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    Required Field
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addActive}
                      onChange={(e) => setAddActive(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <i className="fas fa-save"></i> Save Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Label</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Type</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Scope</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Required</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-left">Status</th>
                <th className="p-3 font-medium text-gray-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i>
                  </td>
                </tr>
              ) : fields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No columns found matching criteria.
                  </td>
                </tr>
              ) : (
                fields.map((f) => {
                  const isEditing = editingId === f.id;
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        data-id={f.id}
                        className={`border-t border-gray-200 hover:bg-gray-50 ${
                          !f.isActive ? 'opacity-60 bg-gray-50' : ''
                        }`}
                      >
                        <td
                          className={`p-3 ${
                            hasFilters
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'cursor-move text-gray-400 hover:text-gray-600 handle'
                          }`}
                          title={hasFilters ? 'Reordering is disabled while filters are active' : ''}
                        >
                          <i className="fas fa-grip-vertical"></i>
                        </td>
                        <td className="p-3 font-medium text-gray-900 text-sm">
                          {f.label}
                          {f.isCustom && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-sm">
                          {f.type}
                          {f.optionsCategory && (
                            <span className="block text-xs text-gray-400">
                              Ref: {f.optionsCategory}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              f.fieldScope === 'LINE'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {f.fieldScope === 'LINE' ? 'Line-wise' : 'Fixed'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-sm">
                          {f.isRequired ? 'Yes' : 'No'}
                        </td>
                        <td className="p-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              f.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {f.isActive ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => (isEditing ? setEditingId(null) : handleStartEdit(f))}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(f.id)}
                              className={`p-1.5 rounded ${
                                f.isActive
                                  ? 'text-gray-500 hover:bg-gray-100'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title="Toggle Visibility"
                            >
                              <i className={`fas ${f.isActive ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                            {f.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleCheckDelete(f.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline Edit Row */}
                      {isEditing && (
                        <tr className="border-t border-gray-200 bg-blue-50/50">
                          <td colSpan={7} className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                              <div>
                                <input
                                  type="text"
                                  value={editForm.label}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, label: e.target.value })
                                  }
                                  required
                                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                />
                              </div>
                              <div>
                                <select
                                  value={editForm.type}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, type: e.target.value })
                                  }
                                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                >
                                  {['Text', 'Number', 'Decimal', 'Date', 'Dropdown', 'Currency', 'Long Text'].map(
                                    (t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              <div>
                                <select
                                  value={editForm.field_scope}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, field_scope: e.target.value })
                                  }
                                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                >
                                  <option value="FIXED">Fixed</option>
                                  <option value="LINE">Line-wise</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={editForm.is_required}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, is_required: e.target.checked })
                                    }
                                  />{' '}
                                  Req
                                </label>
                                <label className="flex items-center gap-1 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={editForm.is_active}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, is_active: e.target.checked })
                                    }
                                  />{' '}
                                  Active
                                </label>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-gray-500 text-sm px-3 py-1.5 hover:bg-gray-200 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(f.id)}
                                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 font-medium"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteCheck.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
            {deleteCheck.count > 0 ? (
              <>
                <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i> Warning: Data in Use
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  The column &quot;<strong>{deleteCheck.label}</strong>&quot; contains data in{' '}
                  <strong>{deleteCheck.count} shipment(s)</strong>. Deleting it will hide the column
                  completely. Do you still want to proceed?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteCheck({ open: false, id: null, label: '', count: 0 })}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleForceDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Force Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
                <p className="text-gray-600 mb-6 text-sm">
                  Are you sure you want to delete &quot;<strong>{deleteCheck.label}</strong>&quot;?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteCheck({ open: false, id: null, label: '', count: 0 })}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleForceDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
