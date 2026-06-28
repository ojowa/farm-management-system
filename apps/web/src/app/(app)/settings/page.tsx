'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { useToasts } from '@/lib/toasts';
import { Card, Button, Input, Select } from '@/components/ui';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToasts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({ fullName: form.fullName });
      success('Profile updated');
      await refreshUser();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await authAPI.updateProfile(formData);
      success('Avatar updated');
      await refreshUser();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to upload avatar');
      setAvatarPreview(user?.avatar || null);
    } finally { setUploadingAvatar(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>
          <form onSubmit={handleProfileSave}>
            <div className="flex items-center gap-6 mb-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change avatar"
              >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.fullName || 'No name set'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                {uploadingAvatar && <p className="text-xs text-green-600 mt-1">Uploading…</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input label="Email" value={user?.email || ''} disabled />
            <div className="flex justify-end mt-4">
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Role</p>
                <p className="text-xs text-gray-500">{user?.role || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Organization</p>
                <p className="text-xs text-gray-500">{user?.organizationId || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
