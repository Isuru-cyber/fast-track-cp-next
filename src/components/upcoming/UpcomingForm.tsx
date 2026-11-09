'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

interface UpcomingFormProps {
  initialRecord?: any;
  customers: string[];
  shipmentModes: string[];
  containerTypes: string[];
  fieldConfigs?: any[];
  masterDataMap?: Record<string, string[]>;
}

export default function UpcomingForm({
  initialRecord,
  customers,
  shipmentModes,
  containerTypes,
  fieldConfigs = [],
  masterDataMap = {},
}: UpcomingFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const isEdit = Boolean(initialRecord);

  const getDropdownOptions = (cat: string | null) => {
    if (!cat) return [];
    return masterDataMap[cat] || masterDataMap[cat.toUpperCase()] || [];
  };

  const [estimateDate, setEstimateDate] = useState(
    initialRecord?.estimateDate ? new Date(initialRecord.estimateDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [customerName, setCustomerName] = useState(initialRecord?.customerName || '');
  const [shipmentMode, setShipmentMode] = useState(initialRecord?.shipmentMode || '');
  const [containerType, setContainerType] = useState(initialRecord?.containerType || '');
  const [approxQty, setApproxQty] = useState(initialRecord?.approxQty ? String(initialRecord.approxQty) : '');
  const [cbm, setCbm] = useState(initialRecord?.cbm ? String(initialRecord.cbm) : '');
  const [status, setStatus] = useState(initialRecord?.status || 'Pending');
  const [remarks, setRemarks] = useState(initialRecord?.remarks || '');
  const [customData, setCustomData] = useState<Record<string, any>>(() => {
    return initialRecord?.customData || {};
  });
  const [loading, setLoading] = useState(false);

  const customFields = fieldConfigs.filter((fc) => fc.isCustom && fc.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      estimateDate,
      customerName,
      shipmentMode,
      containerType,
      approxQty,
      cbm,
      remarks,
      status,
      customData,
    };

    try {
      const url = isEdit ? `/api/upcoming/${initialRecord.id}` : '/api/upcoming';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(isEdit ? 'Upcoming shipment updated.' : 'Upcoming shipment created.');
        router.push('/upcoming');
        router.refresh();
      } else {
        showToast(data.error || 'Failed to save.', 'error');
      }
    } catch {
      showToast('An error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 max-w-4xl mx-auto overflow-y-auto pb-10 pr-2 custom-scrollbar">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit' : 'Add'} Upcoming Shipment</h2>
          <p className="text-sm text-gray-500 mt-1">Plan and forecast future shipments</p>
        </div>
        <Link
          href="/upcoming"
          className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Date *</label>
              <input
                type="date"
                required
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <select
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Mode</label>
              <select
                value={shipmentMode}
                onChange={(e) => setShipmentMode(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              >
                <option value="">Select Mode</option>
                {shipmentModes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              >
                <option value="">Select Type</option>
                {containerTypes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approx Qty</label>
              <input
                type="number"
                step="0.01"
                value={approxQty}
                onChange={(e) => setApproxQty(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CBM</label>
              <input
                type="number"
                step="0.01"
                value={cbm}
                onChange={(e) => setCbm(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              />
            </div>

            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {customFields.map((fc) => {
              const val = customData[fc.fieldKey] ?? '';
              const options = getDropdownOptions(fc.optionsCategory);

              return (
                <div key={fc.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {fc.label} {fc.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  {fc.type === 'Dropdown' ? (
                    <select
                      required={fc.isRequired}
                      value={val}
                      onChange={(e) => setCustomData((prev) => ({ ...prev, [fc.fieldKey]: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
                    >
                      <option value="">Select {fc.label}...</option>
                      {options.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {val && !options.includes(val) && (
                        <option value={val}>{val}</option>
                      )}
                    </select>
                  ) : fc.type === 'Date' ? (
                    <input
                      type="date"
                      required={fc.isRequired}
                      value={val}
                      onChange={(e) => setCustomData((prev) => ({ ...prev, [fc.fieldKey]: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
                    />
                  ) : fc.type === 'Number' || fc.type === 'Decimal' ? (
                    <input
                      type="number"
                      step="0.01"
                      required={fc.isRequired}
                      value={val}
                      onChange={(e) => setCustomData((prev) => ({ ...prev, [fc.fieldKey]: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
                    />
                  ) : (
                    <input
                      type="text"
                      required={fc.isRequired}
                      value={val}
                      placeholder={`Enter ${fc.label}`}
                      onChange={(e) => setCustomData((prev) => ({ ...prev, [fc.fieldKey]: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
                    />
                  )}
                </div>
              );
            })}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50/50"
              ></textarea>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Link
              href="/upcoming"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <i className="fas fa-save"></i> {isEdit ? 'Save Changes' : 'Save Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
