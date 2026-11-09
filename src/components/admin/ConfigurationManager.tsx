'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '@/lib/config';
import ConfirmModal from '@/components/common/ConfirmModal';

interface Props {
  initialConfig: SystemConfig;
}

export default function ConfigurationManager({ initialConfig }: Props) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'display' | 'dashboard' | 'tables' | 'regional'>('display');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Sync client-side UI scale when initialConfig is loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedScale = localStorage.getItem('uiScale') === '80' ? '80' : '100';
      if (savedScale !== config.uiScale) {
        setConfig((prev) => ({ ...prev, uiScale: savedScale }));
      }
    }
  }, [initialConfig.uiScale]);

  // Handle immediate live zoom scale change (80% Compact vs 100% Standard)
  const handleScaleChange = (scale: '80' | '100') => {
    setConfig((prev) => ({ ...prev, uiScale: scale }));
    setHasChanges(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem('uiScale', scale);
      document.documentElement.classList.remove('scale-80', 'scale-90', 'scale-100', 'scale-110', 'comfortable-mode');
      document.documentElement.classList.add(`scale-${scale}`);
      window.dispatchEvent(new Event('uiScaleChanged'));
      showToast(`Display scale set to ${scale}%`, 'info');
    }
  };

  const handleChange = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');

      // Persist client preferences in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('uiScale', config.uiScale);
      }

      setHasChanges(false);
      showToast('System configurations saved successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error saving configurations', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset only the currently active subpage/tab
  const handleResetCurrentTab = () => {
    if (activeTab === 'display') {
      handleScaleChange('100');
      showToast('Display settings reset to 100% Standard View.', 'info');
    } else if (activeTab === 'dashboard') {
      setConfig((prev) => ({
        ...prev,
        defaultDateRange: DEFAULT_SYSTEM_CONFIG.defaultDateRange,
        dashboardMetric: DEFAULT_SYSTEM_CONFIG.dashboardMetric,
        defaultShipmentMode: DEFAULT_SYSTEM_CONFIG.defaultShipmentMode,
      }));
      setHasChanges(true);
      showToast('Dashboard settings reset to defaults.', 'info');
    } else if (activeTab === 'tables') {
      setConfig((prev) => ({
        ...prev,
        defaultRowsPerPage: DEFAULT_SYSTEM_CONFIG.defaultRowsPerPage,
      }));
      setHasChanges(true);
      showToast('Table settings reset to defaults.', 'info');
    } else if (activeTab === 'regional') {
      setConfig((prev) => ({
        ...prev,
        currencyCode: DEFAULT_SYSTEM_CONFIG.currencyCode,
        currencySymbol: DEFAULT_SYSTEM_CONFIG.currencySymbol,
        dateFormat: DEFAULT_SYSTEM_CONFIG.dateFormat,
        inactivityTimeout: DEFAULT_SYSTEM_CONFIG.inactivityTimeout,
      }));
      setHasChanges(true);
      showToast('Regional & localization settings reset to defaults.', 'info');
    }
  };

  // Reset all configurations across all sections
  const handleResetAllDefaults = () => {
    setShowResetModal(true);
  };

  const executeResetDefaults = () => {
    setConfig(DEFAULT_SYSTEM_CONFIG);
    setHasChanges(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiScale', DEFAULT_SYSTEM_CONFIG.uiScale);
      document.documentElement.classList.remove('scale-80', 'scale-90', 'scale-100', 'scale-110');
      document.documentElement.classList.add(`scale-${DEFAULT_SYSTEM_CONFIG.uiScale}`);
      window.dispatchEvent(new Event('uiScaleChanged'));
    }
    setShowResetModal(false);
    showToast('All configurations reset to defaults. Click "Save Configurations" to persist.', 'info');
  };

  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* Top Header Action Bar (Compact) */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <i className="fas fa-sliders text-sm"></i>
          </span>
          <h2 className="text-sm md:text-base font-bold text-gray-900">System Configurations & Preferences</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCurrentTab}
            className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5"
            title="Reset settings for current tab"
          >
            <i className="fas fa-rotate-left text-xs"></i>
            <span className="hidden sm:inline">Reset Section</span>
          </button>
          <button
            type="button"
            onClick={handleResetAllDefaults}
            className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5"
            title="Reset all configurations across all sections"
          >
            <i className="fas fa-arrows-rotate text-xs"></i>
            <span className="hidden sm:inline">Reset All</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 ${
              hasChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                <span>Save Configurations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'display', label: 'Display & Zoom Scale', icon: 'fa-desktop' },
          { id: 'dashboard', label: 'Dashboard Defaults', icon: 'fa-chart-pie' },
          { id: 'tables', label: 'Tables & Records', icon: 'fa-table' },
          { id: 'regional', label: 'Regional & Localization', icon: 'fa-globe' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${tab.icon} ${active ? 'text-indigo-600' : 'text-gray-400'}`}></i>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Page 1: Display & Zoom Scale */}
      {activeTab === 'display' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-magnifying-glass text-indigo-600"></i>
                Application UI Zoom & Scaling Level
              </h3>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-full">
                Active: {config.uiScale}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Select your preferred layout density. Changing this will immediately resize all fonts, cards, buttons, and tables live across the application.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  scale: '80',
                  name: '80% Ultra Compact',
                  root: '12.8px root',
                  desc: 'Compact layout displaying maximum data columns, records, and table rows on wide screens.',
                  tag: 'Compact View',
                },
                {
                  scale: '100',
                  name: '100% Standard View',
                  root: '16.0px root',
                  desc: 'Standard browser layout with comfortable line heights, buttons, and font sizing.',
                  tag: 'Standard Default',
                },
              ].map((opt) => {
                const isSelected = config.uiScale === opt.scale;
                return (
                  <button
                    key={opt.scale}
                    type="button"
                    onClick={() => handleScaleChange(opt.scale as any)}
                    className={`text-left p-4 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900">{opt.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {opt.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-mono">{opt.root}</span>
                      {isSelected ? (
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Applied
                        </span>
                      ) : (
                        <span className="text-gray-400 group-hover:text-gray-600">Click to preview</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Theme Appearance */}
          <div>
            <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-2">
              <i className="fas fa-moon text-indigo-500"></i>
              Theme Appearance
            </h4>
            <p className="text-[11px] text-gray-500 mb-3">
              Switch between clean daylight view and high-contrast dark mode.
            </p>
            <div className="flex gap-3 max-w-md">
              <button
                type="button"
                onClick={() => {
                  document.documentElement.classList.remove('dark-mode');
                  localStorage.setItem('darkMode', 'false');
                  showToast('Light mode active', 'info');
                }}
                className="flex-1 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-semibold text-gray-700"
              >
                <i className="fas fa-sun text-amber-500"></i>
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  document.documentElement.classList.add('dark-mode');
                  localStorage.setItem('darkMode', 'true');
                  showToast('Dark mode active', 'info');
                }}
                className="flex-1 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-semibold text-gray-700"
              >
                <i className="fas fa-moon text-indigo-500"></i>
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Page 2: Dashboard Defaults */}
      {activeTab === 'dashboard' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <i className="fas fa-calendar-days text-indigo-600"></i>
              Default Dashboard Time Range
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Specify which date filter should be selected by default when opening the Dashboard Overview without query parameters.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { id: 'today', label: 'Today', sub: 'Single Day' },
                { id: 'week', label: '7 Days', sub: 'Last 7 Days' },
                { id: 'month', label: 'This Month', sub: 'Current Month' },
                { id: 'quarter', label: 'This Quarter', sub: 'Current Quarter' },
                { id: 'year', label: 'This Year', sub: 'Current Year' },
                { id: 'all', label: 'All Time', sub: 'Full History' },
              ].map((p) => {
                const isSelected = config.defaultDateRange === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChange('defaultDateRange', p.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{p.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Primary Metric & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-2">
                <i className="fas fa-chart-simple text-indigo-500"></i>
                Primary Trend Chart Metric
              </h4>
              <p className="text-[11px] text-gray-500 mb-3">
                Default analytical data point visualized on the main monthly trend curve.
              </p>
              <select
                value={config.dashboardMetric || 'cbm'}
                onChange={(e) => handleChange('dashboardMetric', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="cbm">Volume (CBM - Cubic Meters)</option>
                <option value="value">Financial Spend (Shipment Value $)</option>
                <option value="count">Shipment Count (Number of Shipments)</option>
              </select>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-2">
                <i className="fas fa-ship text-indigo-500"></i>
                Default Shipment Mode Filter
              </h4>
              <p className="text-[11px] text-gray-500 mb-3">
                Initial transport mode priority for dashboard metrics.
              </p>
              <select
                value={config.defaultShipmentMode || 'Sea FCL'}
                onChange={(e) => handleChange('defaultShipmentMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="All">All Modes (Sea FCL, LCL, Air)</option>
                <option value="Sea FCL">Sea FCL (Full Container Load)</option>
                <option value="Sea LCL">Sea LCL (Less Container Load)</option>
                <option value="Air">Air Freight</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Page 3: Tables & Records */}
      {activeTab === 'tables' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <i className="fas fa-list-ol text-indigo-600"></i>
              Default Records Per Page (Pagination Size)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Control the default page size for shipment records and financial ledger tables.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: '50', label: '50 Rows', desc: 'Compact view' },
                { id: '100', label: '100 Rows', desc: 'Extended view' },
                { id: '200', label: '200 Rows', desc: 'Default recommended' },
                { id: '500', label: '500 Rows', desc: 'Bulk view' },
                { id: 'all', label: 'All Rows', desc: 'Continuous scroll' },
              ].map((r) => {
                const isSelected = config.defaultRowsPerPage === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleChange('defaultRowsPerPage', r.id as any)}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-xs">{r.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-2">
              <i className="fas fa-arrow-down-short-wide text-indigo-500"></i>
              Default Table Sorting Order
            </h4>
            <p className="text-[11px] text-gray-500 mb-3">
              How records are initially arranged upon opening the Shipment Records list.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'date_desc', label: 'Booking Date (Newest First)' },
                { id: 'ref_asc', label: 'Reference Number (A to Z)' },
                { id: 'cust_asc', label: 'Customer Name (A to Z)' },
              ].map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50/50 flex items-center gap-2 text-xs font-medium text-gray-700"
                >
                  <i className="fas fa-check text-indigo-600 text-xs"></i>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Page 4: Regional & Localization */}
      {activeTab === 'regional' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                <i className="fas fa-money-bill-wave text-indigo-600"></i>
                Currency Display Symbol & Code
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Default currency notation applied across valuations and payment ledgers.
              </p>
              <select
                value={config.currencyCode || 'USD'}
                onChange={(e) => {
                  const code = e.target.value;
                  const symbols: Record<string, string> = {
                    USD: '$',
                    LKR: 'Rs.',
                    EUR: '€',
                    GBP: '£',
                  };
                  handleChange('currencyCode', code);
                  handleChange('currencySymbol', symbols[code] || '$');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="LKR">LKR (Rs.) - Sri Lankan Rupee</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                <i className="fas fa-calendar-check text-indigo-600"></i>
                Date Display Format
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Preferred representation of shipment and banking dates.
              </p>
              <select
                value={config.dateFormat || 'YYYY-MM-DD'}
                onChange={(e) => handleChange('dateFormat', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard - 2026-09-15)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (SL / British - 15/09/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Format - 09/15/2026)</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <i className="fas fa-stopwatch text-indigo-600"></i>
              Session Inactivity Timeout Warning
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Duration of user inactivity before presenting the session expiry warning dialog.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '15', label: '15 Minutes', sub: 'High Security' },
                { id: '30', label: '30 Minutes', sub: 'Standard Default' },
                { id: '60', label: '60 Minutes', sub: 'Extended Work' },
              ].map((t) => {
                const isSelected = config.inactivityTimeout === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleChange('inactivityTimeout', t.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-xs">{t.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{t.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset All Configurations Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset All Configurations"
        message="Are you sure you want to reset ALL configurations across all sections to factory defaults? You will still need to click 'Save Configurations' to persist changes."
        confirmLabel="Reset All Defaults"
        variant="danger"
        onConfirm={executeResetDefaults}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
