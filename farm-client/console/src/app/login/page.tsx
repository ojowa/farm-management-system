'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { authAudit } from '@/lib/auth-audit';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaMode, setMfaMode] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    authAudit('LOGIN_START', { trigger: 'login_form', email });

    try {
      await login(email, password);
      authAudit('LOGIN_OK', { action: 'redirect_after_login' });
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('from') || '/dashboard';
    } catch (err: any) {
      if (err?.requiresMFA) {
        authAudit('LOGIN_MFA_REQUIRED', { action: 'show_mfa_form' });
        setMfaToken(err.mfaToken);
        setMfaMode(true);
        setError('');
      } else {
        authAudit('LOGIN_FAIL', { trigger: 'login_form', message: err?.message });
        setError(err?.response?.data?.message || err?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    authAudit('MFA_START', { mfaCodeLength: mfaCode.length });

    try {
      const { authClient } = await import('@/lib/api');
      await authClient.post('/auth/verify-mfa', { mfaToken, code: mfaCode });
      authAudit('MFA_OK', { action: 'redirect_after_mfa' });
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('from') || '/dashboard';
    } catch (err: any) {
      authAudit('MFA_FAIL', { message: err?.response?.data?.message || err?.message });
      setError(err?.response?.data?.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  if (mfaMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code from your authenticator app</p>
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="000000"
              maxLength={6}
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full py-3 bg-[#16a34a] text-white font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMfaMode(false);
                setMfaCode('');
                setError('');
              }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">FarmMS Console</h2>
        <p className="text-sm text-gray-500 mb-6">Sign in to Admin Console</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#16a34a] text-white font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
