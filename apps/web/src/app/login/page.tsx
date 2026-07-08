'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaMode, setMfaMode] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      if (err?.requiresMFA) {
        setMfaToken(err.mfaToken);
        setMfaMode(true);
        setError('');
      } else {
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

    try {
      const { apiClient } = await import('@/lib/api');
      await apiClient.post('/auth/verify-mfa', { mfaToken, code: mfaCode });
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  if (mfaMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
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
            <button type="button" onClick={() => { setMfaMode(false); setMfaCode(''); }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-900">
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">FarmMS</h2>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Enter your password"
              required
            />
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
