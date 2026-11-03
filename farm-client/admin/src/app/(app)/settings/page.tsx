'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  User,
  Bell,
  Upload,
  Eye,
  EyeOff,
  Shield,
  Key,
  CheckCircle,
  Loader2,
  Building2,
  Copy,
  Phone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { settingsAPI, currencyAPI } from '@/lib/api';
import { apiClient } from '@/lib/api';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/hooks/useFetch';

type Tab = 'profile' | 'notifications' | 'security' | 'organization';

const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Organization settings' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { canCreate, hasPermission } = usePermission();
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  // View org settings requires organization.read; editing requires organization.write
  const canViewOrganization = hasPermission('organization.read');
  const canEditOrganization = canCreate('organization');
  // Profile, password, notification and 2FA settings only affect the signed-in
  // user's own account, so they stay editable for everyone.
  const [activeTab, setActiveTab] = useState<Tab>(
    canViewOrganization ? 'profile' : 'profile'
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Organization (base currency) state — owner only
  const [orgCurrency, setOrgCurrency] = useState('');
  const [orgCurrencyErrors, setOrgCurrencyErrors] = useState<Record<string, string>>({});

  // 2FA state
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState('');

  const {
    data: currenciesData,
    loading: loadingCurrencies,
  } = useFetch<{ data: any[] }>(
    'currencies-list',
    () => currencyAPI.list(),
    { cacheTime: 60_000 }
  );

  const currencyOptions = ((currenciesData?.data || []) as any[])
    .map((c) => ({ value: c.code, label: `${c.code} ${c.symbol || ''}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    weeklyReport: true,
    lowStockAlerts: true,
    weatherAlerts: false,
    taskReminders: true,
    harvestAlerts: true,
  });

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({});

  const loadProfile = useCallback(async () => {
    try {
      const res = await settingsAPI.getProfile();
      const user = res.data;
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load profile',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  }, [toast]);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await settingsAPI.getPreferences();
      const prefs = res.data;
      if (prefs.notificationPreferences) {
        setNotifications((prev) => ({ ...prev, ...prefs.notificationPreferences }));
      }
      if (typeof prefs.twoFactorEnabled === 'boolean') {
        setTwoFactorEnabled(prefs.twoFactorEnabled);
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load preferences',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  }, [toast]);

  const loadOrganization = useCallback(async () => {
    if (!canViewOrganization || !organizationId) return;
    try {
      const res = await apiClient.get(`/organizations/${organizationId}`);
      const org = res.data;
      setOrgCurrency(org.currency || 'USD');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load organization settings',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  }, [toast, canViewOrganization, organizationId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadProfile(), loadPreferences()]);
      if (canViewOrganization) await loadOrganization();
      setLoading(false);
    };
    init();
  }, [loadProfile, loadPreferences, loadOrganization, canViewOrganization]);

  const handleProfileSave = async () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim() && !lastName.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setSaving(true);
    try {
      await settingsAPI.updateProfile({ firstName, lastName, phone, email, avatar });
      toast({ type: 'success', title: 'Profile updated successfully' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update profile',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOrganizationSave = async () => {
    const errors: Record<string, string> = {};
    if (!orgCurrency) errors.currency = 'Base currency is required';
    else if (!/^[A-Z]{3}$/.test(orgCurrency)) errors.currency = 'Use a valid 3-letter currency code';
    if (Object.keys(errors).length > 0) {
      setOrgCurrencyErrors(errors);
      return;
    }
    setOrgCurrencyErrors({});
    setSaving(true);
    try {
      await apiClient.put(`/organizations/${organizationId}`, { currency: orgCurrency });
      toast({ type: 'success', title: 'Base currency updated' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update base currency',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updatePreferences({ notificationPreferences: notifications });
      toast({ type: 'success', title: 'Notification preferences updated' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update notifications',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySave = async () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) errors.newPassword = 'New password is required';
    else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setSecurityErrors(errors);
      return;
    }
    setSecurityErrors({});
    setSaving(true);
    try {
      await settingsAPI.changePassword({ currentPassword, newPassword });
      toast({ type: 'success', title: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update password',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    setSaving(true);
    try {
      if (twoFactorEnabled) {
        setShow2faSetup(false);
        setQrCodeUrl(null);
        setSetupSecret('');
        // Show disable confirmation inline via state
        setDisableCode('');
      } else {
        const setup = await settingsAPI.generate2FA();
        const secret = setup.data?.secret;
        const otpauthUrl = setup.data?.otpauthUrl;
        if (!secret || !otpauthUrl) {
          throw new Error('The server did not return a 2FA setup secret');
        }
        setSetupSecret(secret);
        const dataUrl = await QRCode.toDataURL(otpauthUrl);
        setQrCodeUrl(dataUrl);
        setSetupCode('');
        setShow2faSetup(true);
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to setup 2FA',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmEnable = async () => {
    if (!setupCode || setupCode.length !== 6) {
      setOrgCurrencyErrors({}); // reset
      return;
    }
    setSaving(true);
    try {
      await settingsAPI.enable2FA(setupCode.trim());
      setShow2faSetup(false);
      setQrCodeUrl(null);
      setSetupSecret('');
      setSetupCode('');
      setTwoFactorEnabled(true);
      toast({
        type: 'success',
        title: '2FA enabled',
        message: 'Two-factor authentication has been enabled with Google Authenticator',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to enable 2FA',
        message: err.response?.data?.message || 'Invalid code — try again',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableCode || disableCode.length !== 6) return;
    setSaving(true);
    try {
      await settingsAPI.disable2FA(disableCode.trim());
      setDisableCode('');
      setTwoFactorEnabled(false);
      toast({
        type: 'success',
        title: '2FA disabled',
        message: 'Two-factor authentication has been disabled',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to disable 2FA',
        message: err.response?.data?.message || 'Invalid code — try again',
      });
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {(canViewOrganization ? tabs : tabs.filter((t) => t.id !== 'organization')).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG up to 2MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name
                </label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (profileErrors.name) setProfileErrors({ ...profileErrors, name: '' });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Last Name
                </label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (profileErrors.name) setProfileErrors({ ...profileErrors, name: '' });
                  }}
                />
              </div>
            </div>
            {profileErrors.name && (
              <p className="text-sm text-destructive">{profileErrors.name}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileErrors.email) setProfileErrors({ ...profileErrors, email: '' });
                  }}
                />
                {profileErrors.email && (
                  <p className="text-sm text-destructive mt-1">{profileErrors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleProfileSave} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about farm activities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Delivery Channels */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Delivery Channels</h3>
              <div className="space-y-3">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                  { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
                  { key: 'inAppNotifications', label: 'In-App Notifications', description: 'Show notifications within the application' },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications[item.key as keyof typeof notifications]}
                        onToggle={() => {
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Types */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Alert Types</h3>
                <div className="space-y-3">
                  {[
                    { key: 'weeklyReport', label: 'Weekly Summary Report', description: 'Get a weekly summary of farm activity' },
                    { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Alert when supplies run low' },
                    { key: 'weatherAlerts', label: 'Weather Alerts', description: 'Notifications about severe weather conditions' },
                    { key: 'taskReminders', label: 'Task Reminders', description: 'Reminders for upcoming farm tasks' },
                    { key: 'harvestAlerts', label: 'Harvest Alerts', description: 'Notifications when crops are ready for harvest' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications[item.key as keyof typeof notifications]}
                        onToggle={() => {
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          });
                        }}
                      />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleNotificationsSave} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Current Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (securityErrors.currentPassword) setSecurityErrors({ ...securityErrors, currentPassword: '' });
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {securityErrors.currentPassword && (
                  <p className="text-sm text-destructive mt-1">{securityErrors.currentPassword}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (securityErrors.newPassword)
                        setSecurityErrors({ ...securityErrors, newPassword: '' });
                    }}
                  />
                  {securityErrors.newPassword && (
                    <p className="text-sm text-destructive mt-1">{securityErrors.newPassword}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (securityErrors.confirmPassword)
                        setSecurityErrors({ ...securityErrors, confirmPassword: '' });
                    }}
                  />
                  {securityErrors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{securityErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSecuritySave} loading={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using Google Authenticator
                or any TOTP app
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!show2faSetup && twoFactorEnabled ? (
                // 2FA is enabled — show disable form
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Two-Factor is Enabled</p>
                        <p className="text-sm text-muted-foreground">
                          Your account is secured with 2FA
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={saving}
                      onClick={() => setDisableCode('')}
                    >
                      Disable 2FA
                    </Button>
                  </div>
                  {disableCode && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium mb-1 block">
                        Verification Code
                      </label>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                        className="w-48"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDisableCode('')}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={disableCode.length !== 6 || saving}
                          onClick={handleConfirmDisable}
                        >
                          Confirm Disable
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 2FA is disabled OR setup in progress
                <div className="space-y-4">
                  {!show2faSetup ? (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Two-Factor is Disabled
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Enable 2FA for additional security
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={saving}
                          onClick={handleTwoFactorToggle}
                        >
                          Enable 2FA
                        </Button>
                      </div>
                    </>
                  ) : (
                    // Setup in progress — show QR code + code input
                    <div className="space-y-4">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Scan this QR code with Google Authenticator
                        </p>
                        {qrCodeUrl ? (
                          <div className="flex justify-center">
                            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            Or enter this setup key manually:
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={setupSecret}
                              readOnly
                              className="w-64 text-center font-mono text-sm bg-muted"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(setupSecret);
                                toast({
                                  type: 'success',
                                  title: 'Setup key copied',
                                });
                              }}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Verification Code <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={setupCode}
                          onChange={(e) => setSetupCode(e.target.value)}
                          className="w-48 text-center font-mono text-lg"
                        />
                        {setupCode.length > 0 && setupCode.length !== 6 && (
                          <p className="text-xs text-red-500 mt-1">
                            Enter all 6 digits
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShow2faSetup(false);
                            setQrCodeUrl(null);
                            setSetupSecret('');
                            setSetupCode('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={setupCode.length !== 6 || saving}
                          onClick={handleConfirmEnable}
                        >
                          Enable 2FA
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organization Tab (owner only) */}
      {activeTab === 'organization' && canViewOrganization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Settings
            </CardTitle>
            <CardDescription>
              Set the organization’s base currency. Finance ledger amounts are
              stored and totaled in this currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Base currency <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select base currency"
                options={currencyOptions}
                value={orgCurrency}
                onChange={(e) => setOrgCurrency(e.target.value)}
                disabled={!currencyOptions.length || saving}
              />
              {orgCurrencyErrors.currency && (
                <p className="text-sm text-destructive mt-1">
                  {orgCurrencyErrors.currency}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Changing the base currency only affects amounts recorded from
                now on; existing ledger entries keep their originally recorded
                currency.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleOrganizationSave} loading={saving} disabled={!canEditOrganization}>
                <Save className="mr-2 h-4 w-4" />
                Save Base Currency
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}