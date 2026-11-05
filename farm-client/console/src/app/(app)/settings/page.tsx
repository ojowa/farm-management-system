'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { mfaAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');

  const loadPreferences = useCallback(async () => {
    try {
      const res = await mfaAPI.getPreferences();
      setEnabled(Boolean(res.data?.twoFactorEnabled));
    } catch (err: any) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const startSetup = async () => {
    setSaving(true);
    try {
      const res = await mfaAPI.generate();
      const generatedSecret = res.data?.secret;
      const generatedUrl = res.data?.otpauthUrl;
      if (!generatedSecret) throw new Error('The server did not return a 2FA setup secret.');
      setSecret(generatedSecret);
      setOtpauthUrl(generatedUrl || '');
      setCode('');
    } catch (err: any) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const enable = async () => {
    if (!/^\d{6}$/.test(code)) {
      toastError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSaving(true);
    try {
      await mfaAPI.enable(code);
      setEnabled(true);
      setSecret('');
      setOtpauthUrl('');
      setCode('');
      toastSuccess('Two-factor authentication enabled');
    } catch (err: any) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (!/^\d{6}$/.test(code)) {
      toastError('Enter the current 6-digit authenticator code to disable 2FA.');
      return;
    }
    setSaving(true);
    try {
      await mfaAPI.disable(code);
      setEnabled(false);
      setSecret('');
      setOtpauthUrl('');
      setCode('');
      toastSuccess('Two-factor authentication disabled');
    } catch (err: any) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">Loading security settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-sm text-gray-500">
          Manage two-factor authentication for your account.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500">
              {enabled
                ? 'A current code from your authenticator app is required to disable this protection.'
                : 'Use an authenticator app to generate a code when signing in.'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!enabled && !secret && (
          <div className="mb-6">
            <button
              type="button"
              onClick={startSetup}
              disabled={saving}
              className="w-full px-4 py-3 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Setting up…' : 'Set up authenticator'}
            </button>
          </div>
        )}

        {!!secret && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Scan this QR code with Google Authenticator, or enter the key below:
            </p>
            <div className="flex flex-col items-center gap-4">
              <img
                alt="QR Code"
                src={otpauthUrl}
                width="200"
                height="200"
                style={{ display: otpauthUrl ? 'block' : 'none' }}
              />
              {!otpauthUrl && secret && (
                <div className="w-48 h-48 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <p className="text-sm text-gray-500">QR code preview</p>
                </div>
              )}
              <div className="text-left w-full max-w-xs">
                <p className="text-xs font-medium text-gray-500 mb-1">Setup key</p>
                <input
                  type="text"
                  value={secret}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">6-digit code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-xl tracking-[0.5em] text-gray-900"
                  placeholder="000000"
                />
              </div>
              <button
                type="button"
                onClick={enable}
                disabled={saving || !/^\d{6}$/.test(code)}
                className="w-full px-4 py-3 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
              >
                {saving ? 'Verifying…' : 'Verify and enable'}
              </button>
            </div>
          </div>
        )}

        {enabled && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Current authenticator code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-xl tracking-[0.5em] text-gray-900"
                placeholder="000000"
              />
            </div>
            <button
              type="button"
              onClick={disable}
              disabled={saving || !/^\d{6}$/.test(code)}
              className="w-full px-4 py-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 border border-red-100"
            >
              {saving ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
