'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

interface ShellProps {
  user: {
    id: number;
    username: string;
    name: string;
    role: 'ADMIN' | 'ENTRY USER' | 'VIEW' | string;
  };
  currentPage?: string;
  children: React.ReactNode;
}

export default function Shell({ user, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true' ||
             document.documentElement.classList.contains('sidebar-collapsed');
    }
    return false;
  });
  const lastPingRef = useRef(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync collapsed state with localStorage and keep html class permanently
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed') === 'true';
      if (saved !== collapsed) {
        setCollapsed(saved);
      }
      if (saved) {
        document.documentElement.classList.add('sidebar-collapsed');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
      }
      document.documentElement.classList.remove('sidebar-init-collapsed');
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      if (next) {
        document.documentElement.classList.add('sidebar-collapsed');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
      }
      return next;
    });
  };

  // Dynamic UI Zoom Scale Listener (80% Compact, 100% Standard)
  useEffect(() => {
    const applyScale = () => {
      if (typeof window !== 'undefined') {
        const savedScale = localStorage.getItem('uiScale') === '80' ? '80' : '100';
        document.documentElement.classList.remove('scale-80', 'scale-90', 'scale-100', 'scale-110', 'comfortable-mode');
        document.documentElement.classList.add(`scale-${savedScale}`);
      }
    };

    applyScale();
    window.addEventListener('uiScaleChanged', applyScale);
    return () => {
      window.removeEventListener('uiScaleChanged', applyScale);
    };
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', String(isDark));
  };

  // Heartbeat & Inactivity Listeners (25m warning, 30m logout)
  const resetInactivityTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // 25 minutes warning (1,500,000 ms)
    warningTimerRef.current = setTimeout(() => {
      showToast('Your session will expire in 5 minutes due to inactivity. Click anywhere to keep your session alive.', 'error');
    }, 1500000);

    // 30 minutes timeout (1,800,000 ms)
    logoutTimerRef.current = setTimeout(() => {
      router.push('/login?timeout=1');
    }, 1800000);
  }, [showToast, router]);

  const pingHeartbeat = useCallback(() => {
    if (Date.now() - lastPingRef.current > 180000) {
      // 3 minutes throttle
      lastPingRef.current = Date.now();
      fetch('/api/auth/heartbeat')
        .then((r) => r.json())
        .then((data) => {
          if (!data.authenticated && data.redirect) {
            window.location.href = data.redirect;
          } else {
            resetInactivityTimers();
          }
        })
        .catch(() => {});
    }
  }, [resetInactivityTimers]);

  useEffect(() => {
    const onUserActivity = () => {
      pingHeartbeat();
    };

    ['click', 'keydown', 'scroll', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    resetInactivityTimers();

    return () => {
      ['click', 'keydown', 'scroll', 'touchstart'].forEach((evt) => {
        window.removeEventListener(evt, onUserActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [pingHeartbeat, resetInactivityTimers]);

  // Determine page title matching current sub-pages
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard Overview';
    if (pathname === '/calendar') return 'Shipment Calendar';
    if (pathname === '/shipments') return 'Shipment Records';
    if (pathname.startsWith('/shipments/new') || pathname.includes('/edit')) return 'Shipment Form';
    if (pathname === '/admin/settings') return 'Custom Columns';
    if (pathname === '/admin/configurations') return 'System Configurations';
    if (pathname === '/admin/dashboard-settings') return 'Dashboard Layout';
    if (pathname === '/admin/master-data') return 'Master Data Catalog';
    if (pathname === '/admin/users') return 'User Management';
    if (pathname === '/admin/logs') return 'Activity Logs';
    if (pathname === '/admin/backups') return 'Backups & Reports';
    if (pathname === '/profile') return 'My Profile';
    if (pathname.startsWith('/payment-options/lc')) return 'LC Details';
    if (pathname.startsWith('/payment-options/tt')) return 'TT Details';
    if (pathname === '/upcoming' || pathname.startsWith('/upcoming/')) return 'Upcoming Forecast';
    if (pathname === '/dev-info') return 'About the Developer';
    return 'Fast-Track System';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isEntryOrAdmin = user.role === 'ADMIN' || user.role === 'ENTRY USER';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        id="sidebar"
        suppressHydrationWarning
        className={`w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-20 overflow-x-hidden ${
          collapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-200 sidebar-logo-container transition-all">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 focus:outline-none transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <i
              className={`fas fa-truck-fast text-2xl transition-transform duration-300 transform ${
                collapsed ? '-scale-x-100' : 'scale-x-100'
              }`}
            ></i>
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            title="Reload Fast-Track System"
            className="sidebar-text ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap overflow-hidden select-none text-left focus:outline-none"
          >
            Fast-Track
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <Link
            href="/dashboard"
            prefetch={true}
            className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              pathname === '/dashboard' ? 'active' : 'text-gray-700'
            }`}
            title="Dashboard"
          >
            <i className="fas fa-chart-pie w-6 text-center shrink-0"></i>
            <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Dashboard</span>
          </Link>

          {isEntryOrAdmin && (
            <Link
              href="/shipments/new"
              prefetch={true}
              className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                pathname === '/shipments/new' ? 'active' : 'text-gray-700'
              }`}
              title="New Entry"
            >
              <i className="fas fa-plus-circle w-6 text-center shrink-0"></i>
              <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">New Entry</span>
            </Link>
          )}

          <Link
            href="/shipments"
            prefetch={true}
            className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              pathname === '/shipments' ? 'active' : 'text-gray-700'
            }`}
            title="Records"
          >
            <i className="fas fa-table w-6 text-center shrink-0"></i>
            <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Records</span>
          </Link>

          {isEntryOrAdmin && (
            <>
              <Link
                href="/payment-options/lc"
                prefetch={true}
                className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                  pathname.startsWith('/payment-options') ? 'active' : 'text-gray-700'
                }`}
                title="Payment Opt"
              >
                <i className="fas fa-money-check-alt w-6 text-center shrink-0"></i>
                <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Payment Opt</span>
              </Link>

              <Link
                href="/upcoming"
                prefetch={true}
                className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                  pathname.startsWith('/upcoming') ? 'active' : 'text-gray-700'
                }`}
                title="Upcoming"
              >
                <i className="fas fa-calendar-check w-6 text-center shrink-0"></i>
                <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Upcoming</span>
              </Link>
            </>
          )}

          <Link
            href="/calendar"
            prefetch={true}
            className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              pathname === '/calendar' ? 'active' : 'text-gray-700'
            }`}
            title="Calendar"
          >
            <i className="fas fa-calendar-alt w-6 text-center shrink-0"></i>
            <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Calendar</span>
          </Link>

          {isEntryOrAdmin && (
            <>
              <div className="pt-4 pb-2 sidebar-section-title">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
              </div>

              <Link
                href={isAdmin ? '/admin/settings' : '/admin/master-data'}
                prefetch={true}
                className={`sidebar-link flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                  pathname.startsWith('/admin') ? 'active' : 'text-gray-700'
                }`}
                title="Settings"
              >
                <i className="fas fa-sliders-h w-6 text-center shrink-0"></i>
                <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Settings</span>
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            href="/dev-info"
            className="sidebar-link flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-1"
            title="About Developer"
          >
            <i className="fas fa-code w-6 text-center shrink-0"></i>
            <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">About Developer</span>
          </Link>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 text-left cursor-pointer"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt w-6 text-center shrink-0"></i>
            <span className="sidebar-text ml-3 whitespace-nowrap overflow-hidden">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-800" id="page-title">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
              title="Toggle Dark Mode"
            >
              <i className="fas fa-moon text-lg"></i>
            </button>
            <Link
              href="/profile"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors ${
                pathname === '/profile' ? 'bg-indigo-50 text-indigo-700' : ''
              }`}
            >
              <i className="fas fa-user-circle text-lg"></i>
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col">{children}</div>
      </main>
    </div>
  );
}
