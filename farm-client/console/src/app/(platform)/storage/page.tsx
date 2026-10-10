'use client';

import React, { useState, useEffect } from 'react';
import {
  platformStorageAPI,
  StorageSettings,
  StorageSettingsInput,
} from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';

const DRIVERS = [
  { value: 's3', label: 'S3 / S3-compatible (Cloudflare R2, AWS, MinIO)' },
  { value: 'local', label: 'Local disk (development only)' },
];

export default function StoragePage() {
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [form, setForm] = useState<StorageSettingsInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await platformStorageAPI.get();
      const data: StorageSettings = res.data;
      setSettings(data);
      setForm({
        driver: data.driver,
        bucket: data.bucket,
        region: data.region,
        endpoint: data.endpoint,
        accessKeyId: data.accessKeyId,
        secretAccessKey: '',
        forcePathStyle: data.forcePathStyle,
      });
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const set = <K extends keyof StorageSettingsInput>(key: K, value: StorageSettingsInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Only send the secret when the user actually typed a new one.
  const payload = (): StorageSettingsInput => {
    const { secretAccessKey, ...rest } = form;
    return secretAccessKey ? { ...rest, secretAccessKey } : rest;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const res = await platformStorageAPI.update(payload());
      const data: StorageSettings = res.data;
      setSettings(data);
      setForm((prev) => ({ ...prev, secretAccessKey: '' }));
      toastSuccess('Storage settings saved');
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await platformStorageAPI.test(payload());
      setTestResult(res.data);
      if (res.data?.ok) toastSuccess(res.data.message);
      else toastError(res.data?.message || 'Connection failed');
    } catch (err) {
      const message = getErrorMessage(err);
      setTestResult({ ok: false, message });
      toastError(message);
    }
    setTesting(false);
  };

  const isS3 = form.driver === 's3';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Object Storage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure where uploaded documents are stored (S3 bucket &amp; credentials). Settings are
          saved in the database and take effect immediately — no redeploy required.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Currently resolving from{' '}
              <span className="font-medium text-gray-600">
                {settings?.source === 'database' ? 'database' : 'environment variables'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 text-xs font-medium text-[#16a34a] border border-[#16a34a] rounded-lg hover:bg-[#16a34a]/5 disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Storage driver</label>
            <select
              value={form.driver || 's3'}
              onChange={(e) => set('driver', e.target.value as StorageSettingsInput['driver'])}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
            >
              {DRIVERS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className={isS3 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'hidden'}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bucket name *</label>
              <input
                value={form.bucket || ''}
                onChange={(e) => set('bucket', e.target.value)}
                placeholder="farm-documents"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                required={isS3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
              <input
                value={form.region || ''}
                onChange={(e) => set('region', e.target.value)}
                placeholder="auto / us-east-1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Endpoint {isS3 && <span className="text-gray-400">(e.g. https://&lt;accountid&gt;.r2.cloudflarestorage.com)</span>}
              </label>
              <input
                value={form.endpoint || ''}
                onChange={(e) => set('endpoint', e.target.value)}
                placeholder="https://<accountid>.r2.cloudflarestorage.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Access key ID</label>
              <input
                value={form.accessKeyId || ''}
                onChange={(e) => set('accessKeyId', e.target.value)}
                placeholder="Access key ID"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Secret access key</label>
              <input
                type="password"
                value={form.secretAccessKey || ''}
                onChange={(e) => set('secretAccessKey', e.target.value)}
                placeholder={settings?.hasSecretAccessKey ? '•••••••• (leave blank to keep)' : 'Secret access key'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
              {settings?.hasSecretAccessKey && (
                <p className="mt-1 text-xs text-gray-400">A secret is already stored.</p>
              )}
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!form.forcePathStyle}
                onChange={(e) => set('forcePathStyle', e.target.checked)}
                className="rounded border-gray-300 text-[#16a34a] focus:ring-[#16a34a]"
              />
              Force path-style addressing (enable for MinIO / some S3-compatible providers)
            </label>
          </div>

          {testResult && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                testResult.ok
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={loadSettings}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
