'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

interface FieldConfigItem {
  id: number;
  fieldKey: string;
  label: string;
  type: string;
  isCustom: boolean;
  isActive: boolean;
  isRequired: boolean;
  displayOrder: number;
  optionsCategory: string | null;
  fieldScope: string;
  module: string;
}

interface ShipmentFormProps {
  mode: 'new' | 'edit' | 'view';
  initialShipment?: any;
  fieldConfigs: FieldConfigItem[];
  masterData: Record<string, string[]>;
  nextNo: string;
  userName: string;
  isAdmin: boolean;
}

export default function ShipmentForm({
  mode,
  initialShipment,
  fieldConfigs,
  masterData,
  nextNo,
  userName,
  isAdmin,
}: ShipmentFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isNew = mode === 'new';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMasterData, setCurrentMasterData] = useState<Record<string, string[]>>(masterData);

  // Quick Add Master Data Modal State
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    category: string;
    label: string;
    targetKey: string;
    targetLineIdx?: number;
    value: string;
    saving: boolean;
  }>({
    isOpen: false,
    category: '',
    label: '',
    targetKey: '',
    value: '',
    saving: false,
  });

  const openQuickAdd = (category: string, label: string, targetKey: string, targetLineIdx?: number) => {
    setQuickAddModal({
      isOpen: true,
      category,
      label,
      targetKey,
      targetLineIdx,
      value: '',
      saving: false,
    });
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddModal.value.trim();
    if (!trimmed) return;

    setQuickAddModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await fetch('/api/admin/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          category: quickAddModal.category,
          value: trimmed,
          module: 'SHIPMENT',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to add option', 'error');
        setQuickAddModal((prev) => ({ ...prev, saving: false }));
        return;
      }

      // Update local master data dropdown state immediately
      setCurrentMasterData((prev) => {
        const cat = quickAddModal.category;
        const existing = prev[cat] || prev[cat.toUpperCase()] || [];
        if (!existing.includes(trimmed)) {
          return {
            ...prev,
            [cat]: [...existing, trimmed].sort(),
          };
        }
        return prev;
      });

      // Automatically select newly added option in the target field
      if (quickAddModal.targetLineIdx !== undefined) {
        handleInvoiceChange(quickAddModal.targetLineIdx, quickAddModal.targetKey, trimmed);
      } else {
        handleInputChange(quickAddModal.targetKey, trimmed);
      }

      showToast(`Added "${trimmed}" to ${quickAddModal.label}.`, 'success');
      setQuickAddModal((prev) => ({ ...prev, isOpen: false, saving: false, value: '' }));
    } catch {
      showToast('Error saving new option', 'error');
      setQuickAddModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Fixed fields split
  const gridFields = useMemo(
    () => fieldConfigs.filter((fc) => fc.fieldScope === 'FIXED' && fc.type !== 'Long Text'),
    [fieldConfigs]
  );
  const fullWidthFields = useMemo(
    () => fieldConfigs.filter((fc) => fc.fieldScope === 'FIXED' && fc.type === 'Long Text'),
    [fieldConfigs]
  );
  const lineFields = useMemo(
    () => fieldConfigs.filter((fc) => fc.fieldScope === 'LINE'),
    [fieldConfigs]
  );

  // Form State - Base & Fixed Custom Fields
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const today = new Date().toISOString().split('T')[0];
    const initial: Record<string, any> = {
      bookingDate: today,
      customerName: '',
      paymentType: '',
      payRefNo: '',
      packageType: '',
      hsCode: '',
      shipmentMode: '',
      incoterm: '',
      cbm: '',
      delFrom: '',
      delTo: '',
      blAwb: '',
      port: '',
      cha: '',
      cusdc: '',
      cusdcDate: '',
      forwarderType: '',
      forwarder: '',
      quotationValue: '',
      delStatus: 'Pending',
      paymentStatus: 'Pending',
      remark: '',
      no: nextNo,
      refNumber: '',
    };

    if (initialShipment) {
      Object.keys(initialShipment).forEach((k) => {
        let val = initialShipment[k];
        if (k === 'bookingDate' && val) {
          val = new Date(val).toISOString().split('T')[0];
        } else if (k === 'cusdcDate' && val) {
          val = new Date(val).toISOString().split('T')[0];
        } else if (k === 'no' && val) {
          val = String(val).padStart(4, '0');
        }
        initial[k] = val ?? '';
      });

      // Merge customData
      const cd = initialShipment.customData || {};
      Object.keys(cd).forEach((ck) => {
        initial[`custom_${ck}`] = cd[ck] ?? '';
      });
    }

    return initial;
  });

  // Dynamic Invoice Lines State
  const [invoices, setInvoices] = useState<any[]>(() => {
    if (initialShipment && initialShipment.invoices && initialShipment.invoices.length > 0) {
      return initialShipment.invoices.map((inv: any) => {
        const row: Record<string, any> = {
          invoiceNo: inv.invoiceNo || '',
          elementsCount: inv.elementsCount || '',
          primaryQtyNw: inv.primaryQtyNw || '',
          secondaryQtyGw: inv.secondaryQtyGw || '',
          shipmentValue: inv.shipmentValue || '',
        };
        const lcd = inv.customData || {};
        Object.keys(lcd).forEach((k) => {
          row[`custom_${k}`] = lcd[k] || '';
        });
        return row;
      });
    }
    return [
      {
        invoiceNo: '',
        elementsCount: '',
        primaryQtyNw: '',
        secondaryQtyGw: '',
        shipmentValue: '',
      },
    ];
  });

  // Duplicate Invoice Nos in current form
  const duplicateInvoiceNos = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach((inv) => {
      const no = (inv.invoiceNo || '').trim();
      if (no) counts[no] = (counts[no] || 0) + 1;
    });
    return Object.keys(counts).filter((no) => counts[no] > 1);
  }, [invoices]);

  // Live Reference Number Calculation
  useEffect(() => {
    if (!isNew) return;

    const dateVal = formData.bookingDate;
    const custVal = (formData.customerName || '').trim() || 'UN';
    const noVal = formData.no || nextNo;

    let yy = '';
    let mm = '';
    let dd = '';

    if (dateVal) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        yy = parts[0].substring(2);
        mm = parts[1];
        dd = parts[2];
      }
    } else {
      const d = new Date();
      yy = String(d.getFullYear()).substring(2);
      mm = String(d.getMonth() + 1).padStart(2, '0');
      dd = String(d.getDate()).padStart(2, '0');
    }

    const words = custVal.split(/[^a-zA-Z0-9]+/).filter((w: string) => w.length > 0);
    let initials = '';
    if (words.length >= 3) {
      initials = words[0].charAt(0) + words[1].charAt(0) + words[2].charAt(0);
    } else if (words.length === 2) {
      initials = words[0].charAt(0) + words[1].charAt(0);
    } else if (words.length === 1) {
      initials = words[0].substring(0, 3);
    }
    initials = initials.toUpperCase();
    if (!initials) initials = 'UN';

    const formattedNo = String(noVal).padStart(4, '0');
    const computedRef = `${yy}${mm}${dd}${initials}${formattedNo}`;

    setFormData((prev) => ({ ...prev, refNumber: computedRef }));
  }, [isNew, formData.bookingDate, formData.customerName, formData.no, nextNo]);

  // LC / TT Payment Options logic (only Active options)
  const [paymentRefs, setPaymentRefs] = useState<any[]>([]);
  const isLcOrTt = formData.paymentType === 'LC' || formData.paymentType === 'TT';

  useEffect(() => {
    if (isLcOrTt) {
      const endpoint = formData.paymentType === 'LC' ? '/api/lc?status_filter=Active' : '/api/tt?status_filter=Active';
      fetch(endpoint)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            if (
              formData.payRefNo &&
              !data.some((r) => (formData.paymentType === 'LC' ? r.lc_no : r.tt_no) === formData.payRefNo)
            ) {
              const singleEndpoint =
                formData.paymentType === 'LC'
                  ? `/api/lc?search=${encodeURIComponent(formData.payRefNo)}`
                  : `/api/tt?search=${encodeURIComponent(formData.payRefNo)}`;
              fetch(singleEndpoint)
                .then((res) => res.json())
                .then((extraData) => {
                  if (Array.isArray(extraData)) {
                    const match = extraData.find(
                      (r) => (formData.paymentType === 'LC' ? r.lc_no : r.tt_no) === formData.payRefNo
                    );
                    if (match) {
                      setPaymentRefs([...data, match]);
                      return;
                    }
                  }
                  setPaymentRefs(data);
                })
                .catch(() => setPaymentRefs(data));
            } else {
              setPaymentRefs(data);
            }
          }
        })
        .catch((err) => console.error('Failed to load payment options:', err));
    }
  }, [formData.paymentType, isLcOrTt]);

  // Active payment references strictly filtered to active statuses
  const activePaymentRefs = useMemo(() => {
    return paymentRefs.filter((item) => item.status === 'Active' || !item.status);
  }, [paymentRefs]);

  // Active selected LC/TT balance preview
  const selectedPaymentRefObj = useMemo(() => {
    if (!isLcOrTt || !formData.payRefNo) return null;
    return paymentRefs.find((r) => (r.lc_no === formData.payRefNo || r.tt_no === formData.payRefNo));
  }, [isLcOrTt, formData.payRefNo, paymentRefs]);

  // Handle Input Changes
  const handleInputChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleInvoiceChange = (index: number, fieldKey: string, value: any) => {
    setInvoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [fieldKey]: value };
      return next;
    });
  };

  const addInvoiceRow = () => {
    setInvoices((prev) => [
      ...prev,
      {
        invoiceNo: '',
        elementsCount: '',
        primaryQtyNw: '',
        secondaryQtyGw: '',
        shipmentValue: '',
      },
    ]);
  };

  const removeInvoiceRow = (index: number) => {
    if (invoices.length <= 1) return;
    setInvoices((prev) => prev.filter((_, i) => i !== index));
  };

  // Template Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const loadTemplatesList = () => {
    fetch('/api/shipments/templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      });
  };

  const openTemplates = () => {
    loadTemplatesList();
    setTemplateModalOpen(true);
  };

  const applyTemplate = (tplData: any) => {
    if (window.confirm('Loading a template will overwrite current form values (except dates and reference numbers). Continue?')) {
      // Exclude dates, no, refNumber so the current/new date is retained
      const cleanData = { ...tplData };
      delete cleanData.bookingDate;
      delete cleanData.cusdcDate;
      delete cleanData.no;
      delete cleanData.refNumber;
      delete cleanData.id;

      setFormData((prev) => ({
        ...prev,
        ...cleanData,
      }));
      setTemplateModalOpen(false);
      showToast('Template loaded. Please fill the shipment date separately.');
    }
  };

  const saveAsTemplate = async () => {
    const tplName = window.prompt('Enter a name for this template:');
    if (!tplName || !tplName.trim()) return;

    // Filter non-array and non-id values, excluding dates to prevent backdates in templates
    const excludedKeys = ['id', 'refNumber', 'no', 'bookingDate', 'cusdcDate', 'createdAt', 'createdByName'];
    const dataToSave: Record<string, any> = {};
    Object.keys(formData).forEach((k) => {
      if (!excludedKeys.includes(k) && formData[k] !== '') {
        dataToSave[k] = formData[k];
      }
    });

    const res = await fetch('/api/shipments/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_name: tplName.trim(), template_data: dataToSave }),
    });
    const result = await res.json();
    if (res.ok) {
      showToast('Template saved successfully!');
    } else {
      showToast(result.error || 'Failed to save template', 'error');
    }
  };

  const deleteTemplate = async (tplId: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await fetch('/api/shipments/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tplId }),
      });
      setTemplates((prev) => prev.filter((t) => t.id !== tplId));
      showToast('Template deleted.');
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Split base vs custom data
      const baseFields: Record<string, any> = {};
      const customData: Record<string, any> = {};

      Object.keys(formData).forEach((k) => {
        if (k.startsWith('custom_')) {
          customData[k.replace('custom_', '')] = formData[k];
        } else {
          baseFields[k] = formData[k];
        }
      });

      const formattedInvoices = invoices.map((inv) => {
        const invBase: Record<string, any> = {};
        const invCustom: Record<string, any> = {};
        Object.keys(inv).forEach((ik) => {
          if (ik.startsWith('custom_')) {
            invCustom[ik.replace('custom_', '')] = inv[ik];
          } else {
            invBase[ik] = inv[ik];
          }
        });
        return {
          ...invBase,
          customData: invCustom,
        };
      });

      const url = isEdit ? `/api/shipments/${initialShipment.id}` : '/api/shipments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseFields,
          customData,
          invoices: formattedInvoices,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save shipment.');
        showToast(data.error || 'Failed to save shipment.', 'error');
      } else {
        showToast(isEdit ? 'Shipment updated successfully.' : 'Shipment created successfully.');
        router.push('/shipments');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDropdownOptions = (cat: string | null) => {
    if (!cat) return [];
    return currentMasterData[cat] || currentMasterData[cat.toUpperCase()] || [];
  };

  const baseInputClass =
    'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm';
  const readonlyInputClass =
    'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed transition-all shadow-sm';

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm flex items-center gap-2 text-sm flex-shrink-0">
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden relative"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {isView ? 'View Shipment' : isEdit ? 'Edit Shipment' : 'New Shipment'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isEdit || isView ? formData.refNumber : 'Enter details for a new shipment'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isView && (
              <button
                type="button"
                onClick={openTemplates}
                className="text-indigo-600 hover:text-indigo-900 font-medium bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-lg border border-indigo-200 transition-colors shadow-sm text-sm flex items-center gap-2"
              >
                <i className="fas fa-bookmark"></i> Templates
              </button>
            )}
            <Link
              href="/shipments"
              className="text-gray-600 hover:text-gray-900 font-medium bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-lg border border-gray-200 transition-colors shadow-sm text-sm flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Back to Records
            </Link>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-10 flex-1 overflow-auto custom-scrollbar">
          {/* Section: Shipment Details */}
          <div>
            <h4 className="text-md font-bold text-gray-700 mb-6 border-b pb-2">Shipment Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              {gridFields.map((fc) => {
                const key = fc.isCustom ? `custom_${fc.fieldKey}` : fc.fieldKey;
                const isAutoReadonly = ['no', 'refNumber', 'createdByName', 'createdAt'].includes(fc.fieldKey);
                const disabled = isView || isAutoReadonly;
                const inputStyle = disabled ? readonlyInputClass : baseInputClass;

                let val = formData[key] ?? '';
                if (fc.fieldKey === 'createdByName' && isNew) val = userName;
                if (fc.fieldKey === 'createdAt' && isNew) val = new Date().toISOString().replace('T', ' ').slice(0, 19);

                return (
                  <div key={fc.id} className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
                      {fc.label} {fc.isRequired && !isAutoReadonly && <span className="text-red-500">*</span>}
                    </label>

                    {fc.fieldKey === 'paymentType' ? (
                      <select
                        disabled={disabled}
                        required={fc.isRequired}
                        value={val}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          handleInputChange(key, nextType);
                          if (nextType !== formData.paymentType && (formData.paymentType === 'LC' || formData.paymentType === 'TT')) {
                            handleInputChange('payRefNo', '');
                          }
                        }}
                        className={inputStyle}
                      >
                        <option value="">Select Option</option>
                        {getDropdownOptions(fc.optionsCategory).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : fc.fieldKey === 'payRefNo' ? (
                      <div className="w-full relative">
                        {isLcOrTt ? (
                          <select
                            disabled={disabled}
                            required={fc.isRequired}
                            value={val}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            className={inputStyle}
                          >
                            <option value="">Select {formData.paymentType}...</option>
                            {/* If current payRefNo is closed or inactive, keep it preserved in edit mode */}
                            {formData.payRefNo &&
                              !activePaymentRefs.some(
                                (item) => (formData.paymentType === 'LC' ? item.lc_no : item.tt_no) === formData.payRefNo
                              ) && (
                                <option value={formData.payRefNo}>
                                  {formData.payRefNo} (Current / Closed)
                                </option>
                              )}
                            {activePaymentRefs.map((item) => {
                              const refVal = formData.paymentType === 'LC' ? item.lc_no : item.tt_no;
                              return (
                                <option key={refVal} value={refVal}>
                                  {refVal} ({item.customer_name || 'No Name'})
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            type="text"
                            disabled={disabled}
                            required={fc.isRequired}
                            value={val}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            className={inputStyle}
                          />
                        )}

                        {/* Balance Preview */}
                        {isLcOrTt && selectedPaymentRefObj && (
                          <div className="flex justify-between items-center mt-1">
                            <div
                              className={`text-xs font-medium ${
                                selectedPaymentRefObj.balance <= 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              Balance: $
                              {Number(selectedPaymentRefObj.balance).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            {isAdmin && !isView && (
                              <Link
                                href={formData.paymentType === 'LC' ? '/payment-options/lc' : '/payment-options/tt'}
                                target="_blank"
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                <i className="fas fa-plus"></i> Add New {formData.paymentType}
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ) : fc.type === 'Dropdown' ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <select
                          disabled={disabled}
                          required={fc.isRequired}
                          value={val}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className={inputStyle}
                        >
                          <option value="">Select Option</option>
                          {getDropdownOptions(fc.optionsCategory).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {!disabled && fc.optionsCategory && (
                          <button
                            type="button"
                            onClick={() => openQuickAdd(fc.optionsCategory!, fc.label, key)}
                            title={`Quick add new ${fc.label}`}
                            className="h-[34px] px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md border border-indigo-200 flex items-center justify-center transition-colors text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        )}
                      </div>
                    ) : fc.type === 'Date' ? (
                      <input
                        type="date"
                        disabled={disabled}
                        required={fc.isRequired}
                        value={val}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className={inputStyle}
                      />
                    ) : (
                      <input
                        type={fc.type === 'Number' || fc.type === 'Decimal' ? 'number' : 'text'}
                        step={fc.type === 'Decimal' ? '0.01' : undefined}
                        disabled={disabled}
                        required={fc.isRequired && !isAutoReadonly}
                        value={val}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className={inputStyle}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Long Text Fields */}
            {fullWidthFields.map((fc) => {
              const key = fc.isCustom ? `custom_${fc.fieldKey}` : fc.fieldKey;
              return (
                <div key={fc.id} className="mt-8 flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
                    {fc.label} {fc.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={4}
                    disabled={isView}
                    required={fc.isRequired}
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className={`${isView ? readonlyInputClass : baseInputClass} resize-y`}
                  ></textarea>
                </div>
              );
            })}
          </div>

          {/* Section: Invoice Details (Line Items) */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h4 className="text-md font-bold text-gray-700">Invoice Details (Line Items)</h4>
              {!isView && (
                <button
                  type="button"
                  onClick={addInvoiceRow}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <i className="fas fa-plus mr-1"></i> Add Invoice Line
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    {lineFields.map((fc) => (
                      <th key={fc.id} className="p-3 border-b border-gray-200 font-semibold whitespace-nowrap">
                        {fc.label} {(fc.isRequired || fc.fieldKey === 'invoiceNo') && <span className="text-red-500">*</span>}
                      </th>
                    ))}
                    {!isView && <th className="p-3 border-b border-gray-200 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const isDup = duplicateInvoiceNos.includes((inv.invoiceNo || '').trim());
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        {lineFields.map((fc) => {
                          const key = fc.isCustom ? `custom_${fc.fieldKey}` : fc.fieldKey;
                          const val = inv[key] ?? '';
                          const isInvNo = fc.fieldKey === 'invoiceNo';

                          let inputStyle = baseInputClass + ' min-w-[120px]';
                          if (isView) inputStyle = readonlyInputClass + ' min-w-[120px]';
                          else if (isInvNo && isDup) inputStyle += ' border-red-500 bg-red-50 text-red-900 focus:ring-red-500';

                          return (
                            <td key={fc.id} className="p-2">
                              {fc.type === 'Dropdown' ? (
                                <div className="flex items-center gap-1">
                                  <select
                                    disabled={isView}
                                    required={fc.isRequired}
                                    value={val}
                                    onChange={(e) => handleInvoiceChange(idx, key, e.target.value)}
                                    className={inputStyle}
                                  >
                                    <option value="">Select Option</option>
                                    {getDropdownOptions(fc.optionsCategory).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  {!isView && fc.optionsCategory && (
                                    <button
                                      type="button"
                                      onClick={() => openQuickAdd(fc.optionsCategory!, fc.label, key, idx)}
                                      title={`Quick add new ${fc.label}`}
                                      className="h-[30px] px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded border border-indigo-200 text-xs shrink-0 cursor-pointer"
                                    >
                                      <i className="fas fa-plus"></i>
                                    </button>
                                  )}
                                </div>
                              ) : fc.type === 'Date' ? (
                                <input
                                  type="date"
                                  disabled={isView}
                                  required={fc.isRequired}
                                  value={val}
                                  onChange={(e) => handleInvoiceChange(idx, key, e.target.value)}
                                  className={inputStyle}
                                />
                              ) : (
                                <input
                                  type={fc.type === 'Number' || fc.type === 'Decimal' ? 'number' : 'text'}
                                  step={fc.type === 'Decimal' ? '0.01' : undefined}
                                  disabled={isView}
                                  required={fc.isRequired || isInvNo}
                                  value={val}
                                  onChange={(e) => handleInvoiceChange(idx, key, e.target.value)}
                                  className={inputStyle}
                                />
                              )}
                            </td>
                          );
                        })}

                        {!isView && (
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => removeInvoiceRow(idx)}
                              disabled={invoices.length <= 1}
                              className={`p-1 rounded ${
                                invoices.length <= 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-red-600'
                              }`}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          {!isView && (
            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 items-center">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 lg:flex-none lg:w-64 bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit Shipment'}
              </button>
              <button
                type="button"
                onClick={saveAsTemplate}
                className="px-6 border border-indigo-300 text-indigo-700 font-medium py-2.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-sm"
              >
                <i className="fas fa-save mr-1"></i> Save as Template
              </button>
              <Link
                href="/shipments"
                className="px-6 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
              >
                Cancel
              </Link>
            </div>
          )}
        </div>
      </form>

      {/* Templates Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-bookmark text-indigo-600"></i> Saved Templates
              </h3>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 custom-scrollbar">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">No saved templates found.</div>
              ) : (
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <span className="font-medium text-gray-700">{tpl.templateName}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplate(tpl.templateData)}
                          className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200 font-medium transition-colors"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(tpl.id)}
                          className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Master Data Option Modal */}
      {quickAddModal.isOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <i className="fas fa-plus-circle text-indigo-600"></i> Add New {quickAddModal.label}
              </h3>
              <button
                type="button"
                onClick={() => setQuickAddModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  {quickAddModal.label} Name / Value *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={`Enter new ${quickAddModal.label}...`}
                  value={quickAddModal.value}
                  onChange={(e) => setQuickAddModal((prev) => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setQuickAddModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAddModal.saving || !quickAddModal.value.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  {quickAddModal.saving ? (
                    <i className="fas fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fas fa-check"></i>
                  )}
                  Save Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
