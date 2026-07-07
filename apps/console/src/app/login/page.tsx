'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ArrowLeft, Shield } from 'lucide-react';

const features = [
  'Multi-tenant administration',
  'Organization & user management',
  'Real-time system monitoring',
  'Subscription & billing control',
];

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
      window.location.href = '/dashboard';
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
      const axios = (await import('axios')).default;
      const client = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
        withCredentials: true,
      });
      await client.post('/auth/verify-mfa', { mfaToken, code: mfaCode });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <span className="text-white text-lg font-semibold tracking-tight">FarmMS</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Platform
            <br />
            Console
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Centralized administration for the Farm Management Platform. Manage users, organizations, and system health
            from a single dashboard.
          </p>

          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">&copy; {new Date().getFullYear()} FarmMS. Admin console access only.</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <span className="text-foreground text-lg font-semibold tracking-tight">FarmMS Console</span>
          </div>

          {mfaMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMfaMode(false);
                  setMfaCode('');
                  setError('');
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handleMfaSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                    {error}
                  </div>
                )}

                <Input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="text-center text-2xl tracking-[0.5em] h-14 font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || mfaCode.length !== 6}
                  loading={loading}
                >
                  Verify Code
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Sign in to Console</h2>
                <p className="text-muted-foreground text-sm mt-1">Admin access credentials required</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@farmms.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={loading} loading={loading}>
                  Sign In
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
