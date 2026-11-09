'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/common/ConfirmModal';

interface Props {
  currentUserId: number;
}

export default function UserManager({ currentUserId }: Props) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('ENTRY USER');
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('ENTRY USER');
  const [editStatus, setEditStatus] = useState('Active');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        role_filter: roleFilter,
        status_filter: statusFilter,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addUsername.trim() || !addPassword) return;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: addName.trim(),
          username: addUsername.trim(),
          password: addPassword,
          role: addRole,
          status: 'Active',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to add user', 'error');
      } else {
        showToast('User added successfully.', 'success');
        setShowAddForm(false);
        setAddName('');
        setAddUsername('');
        setAddPassword('');
        setAddRole('ENTRY USER');
        fetchUsers();
      }
    } catch {
      showToast('Error adding user', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (user: any) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditPassword('');
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleSaveEdit = async (id: number) => {
    setSavingEdit(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          id,
          name: editName,
          password: editPassword || undefined,
          role: editRole,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update user', 'error');
      } else {
        showToast('User updated successfully.', 'success');
        setEditingId(null);
        fetchUsers();
      }
    } catch {
      showToast('Error updating user', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: deleteTargetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete user', 'error');
      } else {
        showToast('User deleted successfully.', 'success');
        setDeleteTargetId(null);
        fetchUsers();
      }
    } catch {
      showToast('Error deleting user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = Boolean(search || roleFilter || statusFilter);

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <div className="relative w-full md:w-auto flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ENTRY USER">Entry User</option>
            <option value="VIEW">View Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="text-gray-600 hover:text-gray-900 font-medium px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm text-sm"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`/api/export/users?search=${encodeURIComponent(search)}&role_filter=${encodeURIComponent(
              roleFilter
            )}&status_filter=${encodeURIComponent(statusFilter)}`}
            download
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <i className="fas fa-file-excel mr-2"></i> Export to Excel
          </a>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
          >
            <i className="fas fa-user-plus"></i> Add User
          </button>
        </div>
      </div>

      {/* Add User Popup Window Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <i className="fas fa-user-plus text-indigo-600"></i>
                Add New User
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50 no-uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      placeholder="e.g. jdoe"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50 no-uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50 no-uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50/50"
                    >
                      <option value="ENTRY USER">Entry User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="VIEW">View Only</option>
                    </select>
                  </div>
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
                  <i className="fas fa-save"></i> Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No users found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isEditing = editingId === u.id;
                  return (
                    <React.Fragment key={u.id}>
                      <tr
                        className={`hover:bg-gray-50 ${u.status === 'Inactive' ? 'opacity-60' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => (isEditing ? setEditingId(null) : handleStartEdit(u))}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded hover:bg-blue-50 transition-colors mr-2"
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {u.id !== currentUserId && (
                            <button
                              onClick={() => setDeleteTargetId(u.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Edit Row */}
                      {isEditing && (
                        <tr className="bg-blue-50/50 border-t border-gray-200">
                          <td colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  required
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm no-uppercase bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  New Password (optional)
                                </label>
                                <input
                                  type="password"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  minLength={6}
                                  placeholder="Leave empty to keep existing password"
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm no-uppercase bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Role
                                </label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  <option value="ENTRY USER">Entry User</option>
                                  <option value="ADMIN">Admin</option>
                                  <option value="VIEW">View Only</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end pb-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => handleSaveEdit(u.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
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

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete User"
        message="Are you sure you want to permanently remove this user? This action cannot be undone."
        confirmLabel="Delete User"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
