'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import Pagination from '@/components/common/Pagination';

export default function LogsManager() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state - Default 200 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        action_filter: actionFilter,
        date_filter: dateFilter,
      });
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setCurrentPage(1);
        if (data.uniqueActions) {
          setUniqueActions(data.uniqueActions);
        }
      }
    } catch {
      showToast('Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, dateFilter]);

  const totalRecords = logs.length;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return logs.slice(startIndex, startIndex + pageSize);
  }, [logs, currentPage, pageSize]);

  const handleDeleteAll = async () => {
    if (
      !confirm(
        'Are you sure you want to delete ALL activity logs? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('All activity logs have been deleted.', 'success');
        fetchLogs();
      } else {
        showToast('Failed to delete logs', 'error');
      }
    } catch {
      showToast('Error deleting logs', 'error');
    }
  };

  const hasFilters = Boolean(search || actionFilter || dateFilter);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 flex-shrink-0 bg-white">
          <div className="relative flex-1 flex flex-wrap md:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full md:max-w-xs shrink-0">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user or record..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50 shrink-0 w-40"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((ua) => (
                <option key={ua} value={ua}>
                  {ua}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50 shrink-0"
            />
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActionFilter('');
                  setDateFilter('');
                }}
                className="text-gray-600 hover:text-gray-900 font-medium px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm text-sm shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`/api/export/logs?search=${encodeURIComponent(search)}&action_filter=${encodeURIComponent(
                actionFilter
              )}&date_filter=${encodeURIComponent(dateFilter)}`}
              download
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <i className="fas fa-file-excel mr-2"></i> Export to Excel
            </a>
            <button
              onClick={handleDeleteAll}
              className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <i className="fas fa-trash-alt mr-2"></i> Delete All
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  Record
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i>
                  </td>
                </tr>
              ) : totalRecords === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.record_id}
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
