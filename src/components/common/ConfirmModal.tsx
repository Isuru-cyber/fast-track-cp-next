'use client';

import React from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600',
          icon: 'fas fa-exclamation-triangle',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
          defaultTitle: 'Delete Confirmation',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          icon: 'fas fa-exclamation-circle',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
          defaultTitle: 'Warning',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-indigo-100 text-indigo-600',
          icon: 'fas fa-question-circle',
          confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
          defaultTitle: 'Confirmation',
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative transform transition-all animate-scale-up border border-gray-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl ${currentStyles.iconBg}`}>
            <i className={currentStyles.icon}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title || currentStyles.defaultTitle}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${currentStyles.confirmBtn}`}
          >
            {isLoading && <i className="fas fa-circle-notch fa-spin text-xs"></i>}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
