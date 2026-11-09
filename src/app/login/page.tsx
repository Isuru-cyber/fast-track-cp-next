'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeout = searchParams.get('timeout');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('fasttrack_saved_username');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (rememberMe) {
      localStorage.setItem('fasttrack_saved_username', username);
    } else {
      localStorage.removeItem('fasttrack_saved_username');
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 relative">
      {/* Top Banner with Indigo background and Inverted Logo */}
      <div className="bg-indigo-600 px-6 py-4 text-center flex items-center justify-center min-h-[90px]">
        {!logoError ? (
          <img
            src="/assets/login_logo.png"
            alt="Fast-Track System Logo"
            className="w-72 max-w-full h-auto object-contain filter drop-shadow-md brightness-0 invert"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex items-center gap-3 text-white py-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-truck-fast text-2xl text-white"></i>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight">Fast-Track</h1>
              <span className="text-xs text-indigo-200 tracking-wider uppercase font-semibold">
                Cargo &amp; Freight System
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-circle shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Timeout Alert */}
        {timeout === '1' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
            <i className="fas fa-clock text-yellow-600 shrink-0"></i>
            <span>Session expired due to inactivity. Please log in again.</span>
          </div>
        )}

        {/* CapsLock Warning */}
        {capsLockOn && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
            <i className="fas fa-arrow-up-from-bracket text-amber-600 shrink-0"></i>
            <span>CapsLock is ON</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fas fa-user text-sm"></i>
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fas fa-lock text-sm"></i>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Remember Username</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-sm"></i>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const initParticles = () => {
    if (typeof (window as any).particlesJS !== 'undefined') {
      (window as any).particlesJS('particles-js', {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: '#ffffff' },
          shape: { type: 'circle' },
          opacity: { value: 0.4, random: false },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.3, width: 1 },
          move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false },
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: { enable: true, mode: 'grab' },
            onclick: { enable: true, mode: 'push' },
            resize: true,
          },
          modes: {
            grab: { distance: 140, line_linked: { opacity: 0.8 } },
            push: { particles_nb: 4 },
          },
        },
        retina_detect: true,
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900">
      {/* Particle Background */}
      <div id="particles-js" className="absolute inset-0 w-full h-full z-0 pointer-events-none"></div>

      <Script
        src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onLoad={initParticles}
      />

      <Suspense fallback={<div className="text-white text-sm z-10">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
