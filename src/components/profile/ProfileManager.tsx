'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface Props {
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export default function ProfileManager({ user }: Props) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update password', 'error');
      } else {
        showToast('Password successfully changed.', 'success');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch {
      showToast('Network error while updating password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-3xl flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
              <i className="fas fa-user"></i> Full Name
            </div>
            <div className="font-medium text-gray-900 text-lg">{user.name}</div>
            <div className="text-sm text-gray-500 mt-1">@{user.username}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
              <i className="fas fa-shield-alt"></i> Role
            </div>
            <div className="font-medium text-gray-900 text-lg">{user.role}</div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Change Password</h3>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm no-uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 chars with letters and numbers"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm no-uppercase"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
