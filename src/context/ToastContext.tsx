'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);


  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast-container" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${
              t.type === 'error' ? 'bg-red-500' : t.type === 'info' ? 'bg-blue-600' : 'bg-green-500'
            } text-white px-6 py-3 rounded shadow-lg flex items-center space-x-3 transition-opacity duration-300 pointer-events-auto`}
          >
            <i className={`fas ${t.type === 'error' ? 'fa-exclamation-circle' : t.type === 'info' ? 'fa-info-circle' : 'fa-check-circle'}`}></i>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
