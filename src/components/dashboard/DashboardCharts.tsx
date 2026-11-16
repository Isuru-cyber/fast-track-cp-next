'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

import { MODERN_PALETTE } from '@/lib/chart-colors';

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748b';

export type MetricType = 'value' | 'cbm' | 'kg' | 'count';

// --- Reusable Metric Selector Pill with Tooltips ---
interface MetricSelectorProps {
  active: MetricType;
  onChange: (m: MetricType) => void;
  available?: MetricType[];
}

export function MetricSelector({
  active,
  onChange,
  available = ['cbm', 'kg', 'value', 'count'],
}: MetricSelectorProps) {
  const configs: Record<MetricType, { label: string; icon: string; short: string }> = {
    cbm: { label: 'Cargo Volume (CBM)', icon: 'fa-cube', short: 'CBM' },
    kg: { label: 'Gross Weight (KG)', icon: 'fa-weight-hanging', short: 'KG' },
    value: { label: 'Invoiced Value (USD $)', icon: 'fa-dollar-sign', short: 'VAL' },
    count: { label: 'Shipment Count', icon: 'fa-hashtag', short: 'QTY' },
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200 text-xs">
      {available.map((m) => {
        const item = configs[m];
        const isSelected = active === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            title={item.label}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
              isSelected
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
            }`}
          >
            <i className={`fas ${item.icon} text-[10px]`}></i>
            <span className="hidden sm:inline">{item.short}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- 1. Trend Analysis Chart (Dual-Axis: Cargo Volume CBM & Invoiced Value USD) ---
interface TrendChartProps {
  labels: string[];
  cbms: number[];
  values: number[];
}

export function TrendChart({ labels, cbms, values }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const totalVal = useMemo(() => values.reduce((a, b) => a + b, 0), [values]);
  const totalCbm = useMemo(() => cbms.reduce((a, b) => a + b, 0), [cbms]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Subtle gradients
    const valueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    valueGradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    valueGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    const cbmGradient = ctx.createLinearGradient(0, 0, 0, 300);
    cbmGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    cbmGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Value ($)',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: valueGradient,
            borderWidth: 2.5,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            yAxisID: 'y1',
          },
          {
            label: 'Volume (CBM)',
            data: cbms,
            borderColor: '#10b981',
            backgroundColor: cbmGradient,
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, weight: 'bold' },
            },
          },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: (item) => {
                const raw = Number(item.raw || 0);
                if (item.datasetIndex === 0) {
                  const pct = totalVal > 0 ? ` (${((raw / totalVal) * 100).toFixed(1)}%)` : '';
                  return ` Value: $${raw.toLocaleString()}${pct}`;
                }
                const pct = totalCbm > 0 ? ` (${((raw / totalCbm) * 100).toFixed(1)}%)` : '';
                return ` Volume: ${raw.toFixed(2)} CBM${pct}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Volume (CBM)', font: { size: 10, weight: 'bold' } },
            border: { dash: [3, 3] },
            grid: { color: '#f1f5f9' },
            beginAtZero: true,
            ticks: { font: { size: 10 } },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Value (USD $)', font: { size: 10, weight: 'bold' } },
            grid: { display: false },
            beginAtZero: true,
            ticks: {
              font: { size: 10 },
              callback: (val) => '$' + Number(val).toLocaleString(),
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [labels, cbms, values, totalVal, totalCbm]);

  return <canvas ref={canvasRef} />;
}

// --- 2. Interactive Incoterm Distribution Chart (Donut with On-Chart % Labels & % in Tooltips) ---
export interface IncotermDataMap {
  labels: string[];
  cbm: number[];
  kg: number[];
  value: number[];
  count: number[];
}

export function InteractiveIncotermChart({ data }: { data: IncotermDataMap }) {
  const [metric, setMetric] = useState<MetricType>('value');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const activeValues = useMemo(() => {
    return data[metric] || [];
  }, [data, metric]);

  const totalMetricVal = useMemo(() => {
    return activeValues.reduce((a, b) => a + Number(b || 0), 0);
  }, [activeValues]);

  const metricTitles: Record<MetricType, string> = {
    cbm: 'Incoterm Share by Volume (CBM)',
    kg: 'Incoterm Share by Gross Weight (KG)',
    value: 'Incoterm Share by Invoiced Value (USD)',
    count: 'Incoterm Share by Shipment Count',
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [
          {
            data: activeValues,
            backgroundColor: MODERN_PALETTE,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '56%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              font: { size: 11 },
            },
          },
          datalabels: {
            display: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              return totalMetricVal > 0 && (val / totalMetricVal) >= 0.03;
            },
            anchor: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalMetricVal > 0 ? val / totalMetricVal : 0;
              return ratio >= 0.12 ? 'center' : 'end';
            },
            align: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalMetricVal > 0 ? val / totalMetricVal : 0;
              return ratio >= 0.12 ? 'center' : 'end';
            },
            offset: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalMetricVal > 0 ? val / totalMetricVal : 0;
              return ratio >= 0.12 ? 0 : 4;
            },
            color: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalMetricVal > 0 ? val / totalMetricVal : 0;
              return ratio >= 0.12 ? '#ffffff' : '#1e293b';
            },
            font: { weight: 'bold', size: 10 },
            formatter: (val: any) => {
              if (!totalMetricVal || totalMetricVal === 0) return '';
              const num = Number(val || 0);
              const pct = ((num / totalMetricVal) * 100).toFixed(0);
              let valStr = '';
              if (metric === 'value') {
                valStr = num >= 1000 ? `$${(num / 1000).toFixed(1)}k` : `$${num}`;
              } else if (metric === 'cbm') {
                valStr = `${num.toFixed(1)}m³`;
              } else if (metric === 'kg') {
                valStr = num >= 1000 ? `${(num / 1000).toFixed(1)}t` : `${Math.round(num)}kg`;
              } else {
                valStr = `${num}`;
              }
              return `${valStr} (${pct}%)`;
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const raw = Number(item.raw || 0);
                const pct = totalMetricVal > 0 ? ` (${((raw / totalMetricVal) * 100).toFixed(1)}%)` : '';
                if (metric === 'value') return ` Value: $${raw.toLocaleString()}${pct}`;
                if (metric === 'cbm') return ` Volume: ${raw.toFixed(2)} CBM${pct}`;
                if (metric === 'kg') return ` Weight: ${raw.toLocaleString()} KG${pct}`;
                return ` Count: ${raw} Shipments${pct}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [data.labels, activeValues, metric, totalMetricVal]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-shield-halved text-emerald-600"></i> Incoterm Share
          </h3>
          <p className="text-xs text-gray-500">{metricTitles[metric]}</p>
        </div>
        <MetricSelector active={metric} onChange={setMetric} />
      </div>
      <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
        {activeValues.length === 0 || activeValues.every((v) => v === 0) ? (
          <p className="text-xs text-gray-400 italic">No incoterm data recorded.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}

// --- 3. Interactive Top Forwarders Chart (Horizontal Bar with Data Labels & Tooltip %) ---
export interface ForwarderRecord {
  name: string;
  cbm: number;
  kg: number;
  value: number;
  count: number;
}

export function InteractiveForwarderChart({ forwarders }: { forwarders: ForwarderRecord[] }) {
  const [metric, setMetric] = useState<MetricType>('cbm');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const grandTotal = useMemo(() => {
    return forwarders.reduce((sum, f) => sum + Number(f[metric] || 0), 0);
  }, [forwarders, metric]);

  const sortedData = useMemo(() => {
    const list = [...forwarders].sort((a, b) => b[metric] - a[metric]).slice(0, 7);
    return {
      labels: list.map((f) => f.name),
      values: list.map((f) => f[metric]),
    };
  }, [forwarders, metric]);

  const metricConfig: Record<MetricType, { label: string; color: string; unit: string; isVal: boolean }> = {
    cbm: { label: 'Volume (CBM)', color: '#6366f1', unit: 'CBM', isVal: false },
    kg: { label: 'Gross Weight (KG)', color: '#0ea5e9', unit: 'KG', isVal: false },
    value: { label: 'Invoiced Value ($)', color: '#10b981', unit: 'USD', isVal: true },
    count: { label: 'Shipment Count', color: '#f59e0b', unit: 'Shipments', isVal: false },
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const cfg = metricConfig[metric];

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: sortedData.labels,
        datasets: [
          {
            label: cfg.label,
            data: sortedData.values,
            backgroundColor: cfg.color,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'right',
            color: '#475569',
            font: { weight: 'bold', size: 10 },
            formatter: (val: any) => {
              const num = Number(val || 0);
              if (cfg.isVal) return '$' + num.toLocaleString();
              if (metric === 'cbm') return num.toFixed(2) + ' CBM';
              if (metric === 'kg') return Math.round(num).toLocaleString() + ' KG';
              return num + ' Shp';
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const val = Number(item.raw || 0);
                const pct = grandTotal > 0 ? ` (${((val / grandTotal) * 100).toFixed(1)}% of total)` : '';
                if (cfg.isVal) return ` Value: $${val.toLocaleString()}${pct}`;
                if (metric === 'cbm') return ` Volume: ${val.toFixed(2)} CBM${pct}`;
                if (metric === 'kg') return ` Weight: ${val.toLocaleString()} KG${pct}`;
                return ` Count: ${val} Shipments${pct}`;
              },
            },
          },
        },
        scales: {
          x: {
            grace: '18%', // Extra padding on right so labels never get clipped
            grid: { color: '#f8fafc' },
            ticks: {
              font: { size: 10 },
              callback: (v) => (cfg.isVal ? '$' + Number(v).toLocaleString() : Number(v).toLocaleString()),
            },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: 'bold' } },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [sortedData, metric, grandTotal]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-dolly text-sky-600"></i> Top Forwarders
          </h3>
          <p className="text-xs text-gray-500">Ranked by {metricConfig[metric].label}</p>
        </div>
        <MetricSelector active={metric} onChange={setMetric} />
      </div>
      <div className="flex-1 min-h-[220px] relative">
        {sortedData.labels.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-12">No forwarder data in selection.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}

// --- 4. Interactive Shipment Mode Chart (Donut with On-Chart % Labels & Tooltip %) ---
export interface ModeRecord {
  name: string;
  cbm: number;
  kg: number;
  value: number;
  count: number;
}

export function InteractiveModeChart({ modes }: { modes: ModeRecord[] }) {
  const [metric, setMetric] = useState<MetricType>('count');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const activeValues = useMemo(() => {
    return modes.map((m) => m[metric]);
  }, [modes, metric]);

  const totalModeVal = useMemo(() => {
    return activeValues.reduce((a, b) => a + Number(b || 0), 0);
  }, [activeValues]);

  const metricTitles: Record<MetricType, string> = {
    count: 'Distribution by Shipment Frequency',
    value: 'Distribution by Invoiced Value (USD)',
    cbm: 'Distribution by Cargo Volume (CBM)',
    kg: 'Distribution by Gross Weight (KG)',
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: modes.map((m) => m.name),
        datasets: [
          {
            data: activeValues,
            backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '56%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              font: { size: 11 },
            },
          },
          datalabels: {
            display: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              return totalModeVal > 0 && (val / totalModeVal) >= 0.03;
            },
            anchor: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalModeVal > 0 ? val / totalModeVal : 0;
              return ratio >= 0.12 ? 'center' : 'end';
            },
            align: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalModeVal > 0 ? val / totalModeVal : 0;
              return ratio >= 0.12 ? 'center' : 'end';
            },
            offset: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalModeVal > 0 ? val / totalModeVal : 0;
              return ratio >= 0.12 ? 0 : 4;
            },
            color: (context) => {
              const val = Number(context.dataset.data[context.dataIndex] || 0);
              const ratio = totalModeVal > 0 ? val / totalModeVal : 0;
              return ratio >= 0.12 ? '#ffffff' : '#1e293b';
            },
            font: { weight: 'bold', size: 10 },
            formatter: (val: any) => {
              if (!totalModeVal || totalModeVal === 0) return '';
              const num = Number(val || 0);
              const pct = ((num / totalModeVal) * 100).toFixed(0);
              let valStr = '';
              if (metric === 'value') {
                valStr = num >= 1000 ? `$${(num / 1000).toFixed(1)}k` : `$${num}`;
              } else if (metric === 'cbm') {
                valStr = `${num.toFixed(1)}m³`;
              } else if (metric === 'kg') {
                valStr = num >= 1000 ? `${(num / 1000).toFixed(1)}t` : `${Math.round(num)}kg`;
              } else {
                valStr = `${num}`;
              }
              return `${valStr} (${pct}%)`;
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const raw = Number(item.raw || 0);
                const pct = totalModeVal > 0 ? ` (${((raw / totalModeVal) * 100).toFixed(1)}%)` : '';
                if (metric === 'value') return ` Value: $${raw.toLocaleString()}${pct}`;
                if (metric === 'cbm') return ` Volume: ${raw.toFixed(2)} CBM${pct}`;
                if (metric === 'kg') return ` Weight: ${raw.toLocaleString()} KG${pct}`;
                return ` Count: ${raw} Shipments${pct}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [modes, activeValues, metric, totalModeVal]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-plane-departure text-purple-600"></i> Shipment Modes
          </h3>
          <p className="text-xs text-gray-500">{metricTitles[metric]}</p>
        </div>
        <MetricSelector active={metric} onChange={setMetric} />
      </div>
      <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
        {activeValues.length === 0 || activeValues.every((v) => v === 0) ? (
          <p className="text-xs text-gray-400 italic">No shipment mode data recorded.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}

// --- 5. Interactive Top Customers Chart (Horizontal Bar with Data Labels & Tooltip %) ---
export interface CustomerRecord {
  name: string;
  cbm: number;
  kg: number;
  value: number;
  count: number;
}

export function InteractiveCustomerChart({ customers }: { customers: CustomerRecord[] }) {
  const [metric, setMetric] = useState<MetricType>('value');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const grandTotal = useMemo(() => {
    return customers.reduce((sum, c) => sum + Number(c[metric] || 0), 0);
  }, [customers, metric]);

  const sortedData = useMemo(() => {
    const list = [...customers].sort((a, b) => b[metric] - a[metric]).slice(0, 7);
    return {
      labels: list.map((c) => c.name),
      values: list.map((c) => c[metric]),
    };
  }, [customers, metric]);

  const metricConfig: Record<MetricType, { label: string; color: string; isVal: boolean }> = {
    value: { label: 'Invoiced Value ($)', color: '#f59e0b', isVal: true },
    cbm: { label: 'Cargo Volume (CBM)', color: '#10b981', isVal: false },
    kg: { label: 'Gross Weight (KG)', color: '#6366f1', isVal: false },
    count: { label: 'Shipment Count', color: '#0ea5e9', isVal: false },
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const cfg = metricConfig[metric];

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: sortedData.labels,
        datasets: [
          {
            label: cfg.label,
            data: sortedData.values,
            backgroundColor: cfg.color,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'right',
            color: '#475569',
            font: { weight: 'bold', size: 10 },
            formatter: (val: any) => {
              const num = Number(val || 0);
              if (cfg.isVal) return '$' + num.toLocaleString();
              if (metric === 'cbm') return num.toFixed(2) + ' CBM';
              if (metric === 'kg') return Math.round(num).toLocaleString() + ' KG';
              return num + ' Shp';
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const val = Number(item.raw || 0);
                const pct = grandTotal > 0 ? ` (${((val / grandTotal) * 100).toFixed(1)}% of total)` : '';
                if (cfg.isVal) return ` Value: $${val.toLocaleString()}${pct}`;
                if (metric === 'cbm') return ` Volume: ${val.toFixed(2)} CBM${pct}`;
                if (metric === 'kg') return ` Weight: ${val.toLocaleString()} KG${pct}`;
                return ` Count: ${val} Shipments${pct}`;
              },
            },
          },
        },
        scales: {
          x: {
            grace: '18%', // Extra right margin so data labels are never cut off
            grid: { color: '#f8fafc' },
            ticks: {
              font: { size: 10 },
              callback: (v) => (cfg.isVal ? '$' + Number(v).toLocaleString() : Number(v).toLocaleString()),
            },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: 'bold' } },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [sortedData, metric, grandTotal]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-trophy text-amber-500"></i> Top Accounts Overview
          </h3>
          <p className="text-xs text-gray-500">Ranked by {metricConfig[metric].label}</p>
        </div>
        <MetricSelector active={metric} onChange={setMetric} />
      </div>
      <div className="flex-1 min-h-[220px] relative">
        {sortedData.labels.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-12">No customer data in selection.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}

// --- Dynamic Widget Chart (For Admin Customizable Widgets) ---
interface DynamicWidgetChartProps {
  widget: {
    id: number;
    title: string;
    type: string;
    dataColumn: string | null;
    metric: string;
  };
  dataObj: {
    labels: string[];
    counts: number[];
    values: number[];
    cbms: number[];
    qts: number[];
  };
  colorIndex?: number;
}

export function DynamicWidgetChart({ widget, dataObj, colorIndex = 0 }: DynamicWidgetChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const color = MODERN_PALETTE[colorIndex % MODERN_PALETTE.length];
    let metricArr = dataObj.counts;
    let metricLabel = 'Shipments';
    let isVal = false;

    if (widget.metric === 'value') {
      metricArr = dataObj.values;
      metricLabel = 'Value ($)';
      isVal = true;
    } else if (widget.metric === 'cbm') {
      metricArr = dataObj.cbms;
      metricLabel = 'CBM';
    } else if (widget.metric === 'qty') {
      metricArr = dataObj.qts;
      metricLabel = 'Qty (GW)';
    }

    if (widget.type === 'chart_bar') {
      chartInstanceRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: dataObj.labels,
          datasets: [
            {
              label: metricLabel,
              data: metricArr,
              backgroundColor: color,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
            y: {
              border: { dash: [3, 3] },
              grid: { color: '#f1f5f9' },
              beginAtZero: true,
              ticks: { font: { size: 10 } },
            },
          },
          plugins: {
            legend: { display: false },
            datalabels: {
              anchor: 'end',
              align: 'top',
              color: '#64748b',
              font: { weight: 'bold', size: 9 },
              formatter: (val: any) => (isVal ? '$' + Number(val).toLocaleString() : val),
            },
          },
        },
      });
    } else if (widget.type === 'chart_pie' || widget.type === 'chart_doughnut') {
      chartInstanceRef.current = new Chart(canvasRef.current, {
        type: widget.type === 'chart_doughnut' ? 'doughnut' : 'pie',
        data: {
          labels: dataObj.labels,
          datasets: [
            {
              data: metricArr,
              backgroundColor: MODERN_PALETTE,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: widget.type === 'chart_doughnut' ? '65%' : '0%',
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 10 } },
            },
            datalabels: { display: false },
          },
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [widget, dataObj, colorIndex]);

  return <canvas ref={canvasRef} />;
}
