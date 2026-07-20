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
  Globe,
  Key,
  CheckCircle,
  Link,
  Copy,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toasts';
import { useReadOnly } from '@/lib/useReadOnly';
import { settingsAPI } from '@/lib/api';

type Tab = 'profile' | 'notifications' | 'security' | 'integrations';

const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  { id: 'integrations', label: 'Integrations', icon: Link, description: 'API keys' },
];

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  service: string;
  isActive: boolean;
  key?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyService, setNewKeyService] = useState('weather');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);

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

  const loadApiKeys = useCallback(async () => {
    try {
      const res = await settingsAPI.listApiKeys();
      setApiKeys(res.data);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load API keys',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadProfile(), loadPreferences(), loadApiKeys()]);
      setLoading(false);
    };
    init();
  }, [loadProfile, loadPreferences, loadApiKeys]);

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
      await settingsAPI.updatePreferences({ twoFactorEnabled: !twoFactorEnabled });
      setTwoFactorEnabled(!twoFactorEnabled);
      toast({
        type: 'success',
        title: twoFactorEnabled ? '2FA disabled' : '2FA enabled',
        message: twoFactorEnabled
          ? 'Two-factor authentication has been disabled'
          : 'Two-factor authentication has been enabled',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update 2FA',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({ type: 'error', title: 'API key name is required' });
      return;
    }
    setCreatingKey(true);
    try {
      const res = await settingsAPI.createApiKey({ name: newKeyName, service: newKeyService });
      const newKey = res.data;
      setApiKeys([...apiKeys, { id: newKey.id, name: newKey.name, keyPrefix: newKey.keyPrefix, service: newKey.service, isActive: newKey.isActive, key: newKey.key }]);
      setNewKeyName('');
      setShowNewKeyForm(false);
      toast({ type: 'success', title: 'API key created', message: 'Copy your key now - it won\'t be shown again.' });
      setShowApiKey(newKey.id);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create API key',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Delete this API key? Any service using it will stop working.')) return;
    try {
      await settingsAPI.deleteApiKey(id);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast({ type: 'success', title: 'API key deleted' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete API key',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleToggleApiKey = async (id: string) => {
    try {
      await settingsAPI.toggleApiKey(id);
      setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k)));
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to toggle API key',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ type: 'success', title: 'API key copied to clipboard' });
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
        {tabs.map((tab) => {
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
                {!readOnly && (
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG up to 2MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
              {!readOnly && (
                <Button onClick={handleProfileSave} loading={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </Button>
              )}
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
                          if (readOnly) return;
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
                          if (readOnly) return;
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
              {!readOnly && (
                <Button onClick={handleNotificationsSave} loading={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              )}
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
              <div className="grid grid-cols-2 gap-4">
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
                {!readOnly && (
                  <Button onClick={handleSecuritySave} loading={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                )}
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
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {twoFactorEnabled ? 'Two-Factor is Enabled' : 'Two-Factor is Disabled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? 'Your account is secured with 2FA'
                        : 'Enable 2FA for additional security'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorEnabled && (
                    <Badge variant="success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  )}
                  <Button
                    variant={twoFactorEnabled ? 'outline' : 'default'}
                    size="sm"
                    disabled={readOnly || saving}
                    onClick={handleTwoFactorToggle}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* API Keys */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for external service connections
                </CardDescription>
              </div>
              {!readOnly && (
                <Button size="sm" onClick={() => setShowNewKeyForm(!showNewKeyForm)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Key
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {/* New Key Form */}
              {showNewKeyForm && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
                  <h4 className="font-medium">Create New API Key</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Key Name</label>
                      <Input
                        placeholder="e.g., Weather Service"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Service Type</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newKeyService}
                        onChange={(e) => setNewKeyService(e.target.value)}
                      >
                        <option value="weather">Weather API</option>
                        <option value="payment">Payment Gateway</option>
                        <option value="sms">SMS Service</option>
                        <option value="maps">Maps / Geolocation</option>
                        <option value="analytics">Analytics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddApiKey} disabled={creatingKey}>
                      {creatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Key
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNewKeyForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Keys List */}
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No API keys yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add an API key to connect external services
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => {
                    const serviceIcons: Record<string, React.ElementType> = {
                      weather: Globe,
                      payment: Globe,
                      sms: Globe,
                      maps: Globe,
                      analytics: Globe,
                      other: Link,
                    };
                    const ServiceIcon = serviceIcons[apiKey.service] || Link;
                    return (
                      <div
                        key={apiKey.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <ServiceIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{apiKey.name}</p>
                            <Badge variant={apiKey.isActive ? 'success' : 'secondary'}>
                              {apiKey.isActive ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {showApiKey === apiKey.id && apiKey.key
                                ? apiKey.key
                                : `${apiKey.keyPrefix}••••••••`}
                            </code>
                            <button
                              onClick={() =>
                                setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)
                              }
                              className="text-muted-foreground hover:text-foreground"
                              title={showApiKey === apiKey.id ? 'Hide' : 'Reveal'}
                            >
                              {showApiKey === apiKey.id ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </button>
                            {showApiKey === apiKey.id && apiKey.key && (
                              <button
                                onClick={() => handleCopyKey(apiKey.key!)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Copy"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            enabled={apiKey.isActive}
                            onToggle={() => {
                              if (readOnly) return;
                              handleToggleApiKey(apiKey.id);
                            }}
                          />
                          {!readOnly && (
                            <button
                              onClick={() => handleDeleteApiKey(apiKey.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
