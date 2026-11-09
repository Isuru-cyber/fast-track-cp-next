'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

import { MODERN_PALETTE } from '@/lib/chart-colors';

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748b';

// --- 1. Modern Volume & Spend Run-Rate Trend ---
interface TrendChartProps {
  labels: string[];
  cbms: number[];
  values: number[];
}

export function TrendChart({ labels, cbms, values }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create subtle gradient for Value
    const valueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    valueGradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    valueGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    // Create subtle gradient for CBM
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
                if (item.datasetIndex === 0) {
                  return ` Value: $${Number(item.raw).toLocaleString()}`;
                }
                return ` Volume: ${Number(item.raw).toFixed(2)} CBM`;
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
  }, [labels, cbms, values]);

  return <canvas ref={canvasRef} />;
}

// --- 2. Forwarder Performance Matrix ---
interface ForwarderMatrixProps {
  labels: string[];
  cbms: number[];
  counts: number[];
}

export function ForwarderMatrixChart({ labels, cbms, counts }: ForwarderMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Volume (CBM)',
            data: cbms,
            backgroundColor: '#6366f1',
            borderRadius: 6,
          },
          {
            label: 'Shipment Count',
            data: counts,
            backgroundColor: '#0ea5e9',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              font: { size: 10 },
            },
          },
          datalabels: { display: false },
        },
        scales: {
          x: {
            grid: { color: '#f8fafc' },
            ticks: { font: { size: 10 } },
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
  }, [labels, cbms, counts]);

  return <canvas ref={canvasRef} />;
}

// --- 3. Incoterm Risk & Cost Distribution (Donut) ---
interface IncotermDonutProps {
  labels: string[];
  values: number[];
}

export function IncotermDonutChart({ labels, values }: IncotermDonutProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
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
        cutout: '70%',
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
          datalabels: { display: false },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [labels, values]);

  return <canvas ref={canvasRef} />;
}

// --- 4. Dynamic Widget Chart (For Admin Customizable Widgets) ---
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
    } else if (widget.type === 'list') {
      chartInstanceRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: dataObj.labels,
          datasets: [
            {
              label: metricLabel,
              data: metricArr,
              backgroundColor: color,
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              border: { dash: [3, 3] },
              grid: { color: '#f1f5f9' },
              beginAtZero: true,
              ticks: { font: { size: 10 } },
            },
            y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
          },
          plugins: {
            legend: { display: false },
            datalabels: {
              anchor: 'end',
              align: 'right',
              color: '#64748b',
              font: { size: 9 },
              formatter: (val: any) => (isVal ? '$' + Number(val).toLocaleString() : val),
            },
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
