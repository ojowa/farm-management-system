'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { authAudit } from '@/lib/auth-audit';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    authAudit('LOGIN_START', { trigger: 'register_console', email });
    try {
      await axios.post('/auth/register-console', {
        email,
        firstName,
        middleName: middleName || undefined,
        lastName,
        password,
      });
      authAudit('LOGIN_OK', { action: 'register_console_success', email });
      setSuccess({ email, name: [firstName, middleName, lastName].filter(Boolean).join(' ') });
    } catch (err: any) {
      authAudit('LOGIN_FAIL', { trigger: 'register_console', message: err?.response?.data?.message || err?.message });
      setError(err?.response?.data?.message || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">Console User Created</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">{success.name}</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-2">Email</p>
            <p className="text-sm font-medium text-gray-900 mb-3">{success.email}</p>
            <p className="text-xs text-gray-500 mb-2">Password</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-gray-900 flex-1 break-all">{password}</code>
              <button
                onClick={copyPassword}
                className="shrink-0 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
            Save these credentials now. The password will not be shown again.
          </p>

          <a
            href="/login"
            className="block w-full py-3 text-center bg-[#16a34a] text-white font-medium rounded-lg hover:bg-[#15803d] transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">FarmMS Console</h2>
        <p className="text-sm text-gray-500 mb-6">Register a new console user</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Re-enter password"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#16a34a] text-white font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Console User'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-900">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
