'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [50, 100, 200, 500],
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with ellipsis window
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div
      className={`px-6 py-3.5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 select-none shrink-0 ${className}`}
    >
      {/* Left: Info & Rows per page */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div>
          Showing <span className="font-semibold text-gray-800">{startItem}</span> to{' '}
          <span className="font-semibold text-gray-800">{endItem}</span> of{' '}
          <span className="font-semibold text-gray-800">{totalItems}</span> records
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 border border-gray-200 rounded text-xs bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            title="First Page"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-angles-left"></i>
          </button>

          {/* Prev Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            title="Previous Page"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {/* Number Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">
                    ...
                  </span>
                );
              }
              const isCurrent = p === safePage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(Number(p))}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <span className="sm:hidden text-xs text-gray-600 px-2 font-medium">
            Page {safePage} of {totalPages}
          </span>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            title="Next Page"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-chevron-right"></i>
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            title="Last Page"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-angles-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
