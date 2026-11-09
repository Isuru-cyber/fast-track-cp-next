'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  userRole?: string;
}

export default function AdminTabs({ userRole = 'ADMIN' }: Props) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN';

  const tabs = [
    {
      label: 'Custom Columns',
      href: '/admin/settings',
      icon: 'fa-sliders-h',
      visible: isAdmin,
    },
    {
      label: 'Configurations',
      href: '/admin/configurations',
      icon: 'fa-cogs',
      visible: isAdmin,
    },
    {
      label: 'Master Data',
      href: '/admin/master-data',
      icon: 'fa-database',
      visible: true,
    },
    {
      label: 'Dashboard Layout',
      href: '/admin/dashboard-settings',
      icon: 'fa-desktop',
      visible: isAdmin,
    },
    {
      label: 'User Accounts',
      href: '/admin/users',
      icon: 'fa-users',
      visible: isAdmin,
    },
    {
      label: 'Activity Logs',
      href: '/admin/logs',
      icon: 'fa-history',
      visible: isAdmin,
    },
    {
      label: 'Backups & Reports',
      href: '/admin/backups',
      icon: 'fa-cloud-arrow-down',
      visible: isAdmin,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-wrap items-center gap-1.5 shrink-0">
      {visibleTabs.map((t) => {
        const isActive = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <i className={`fas ${t.icon} text-xs`}></i>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
