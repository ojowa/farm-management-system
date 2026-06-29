'use client';

import React, { useState } from 'react';
import {
  Save,
  User,
  Building2,
  Bell,
  Upload,
  Eye,
  EyeOff,
  Shield,
  Globe,
  Palette,
  Key,
  CheckCircle,
  Link,
  Cloud,
  CreditCard,
  MapPin,
  Copy,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toasts';
import { useAuth } from '@/lib/auth';

type Tab = 'profile' | 'organization' | 'notifications' | 'security' | 'integrations';

const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Company settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  { id: 'integrations', label: 'Integrations', icon: Link, description: 'API keys & services' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Organization state
  const [org, setOrg] = useState({
    name: '',
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
  });

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
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({});

  // Integrations state
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Weather API', key: 'wx-abc123def456', service: 'weather', enabled: true, lastUsed: '2026-06-28' },
    { id: '2', name: 'Payment Gateway', key: 'pg-xyz789ghi012', service: 'payment', enabled: true, lastUsed: '2026-06-27' },
    { id: '3', name: 'SMS Service', key: 'sms-mno345pqr678', service: 'sms', enabled: false, lastUsed: '2026-06-15' },
  ]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyService, setNewKeyService] = useState('weather');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  const handleProfileSave = async () => {
    const errors: Record<string, string> = {};
    if (!profile.name.trim()) errors.name = 'Name is required';
    if (!profile.email.trim()) errors.email = 'Email is required';
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Invalid email address';
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setSaving(true);
    try {
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

  const handleOrgSave = async () => {
    setSaving(true);
    try {
      toast({ type: 'success', title: 'Organization settings updated' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update organization',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    try {
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
    if (security.newPassword && security.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (security.newPassword && security.newPassword !== security.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setSecurityErrors(errors);
      return;
    }
    setSecurityErrors({});
    setSaving(true);
    try {
      toast({ type: 'success', title: 'Security settings updated' });
      setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update security',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddApiKey = () => {
    if (!newKeyName.trim()) {
      toast({ type: 'error', title: 'API key name is required' });
      return;
    }
    const generatedKey = `${newKeyService.substring(0, 2)}-${Math.random().toString(36).substring(2, 15)}`;
    setApiKeys([
      ...apiKeys,
      {
        id: String(Date.now()),
        name: newKeyName,
        key: generatedKey,
        service: newKeyService,
        enabled: true,
        lastUsed: 'Never',
      },
    ]);
    setNewKeyName('');
    setShowNewKeyForm(false);
    toast({ type: 'success', title: 'API key created', message: 'Copy your key now - it won\'t be shown again.' });
    setShowApiKey(String(Date.now()));
  };

  const handleDeleteApiKey = (id: string) => {
    if (!confirm('Delete this API key? Any service using it will stop working.')) return;
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast({ type: 'success', title: 'API key deleted' });
  };

  const handleToggleApiKey = (id: string) => {
    setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, enabled: !k.enabled } : k)));
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
                <User className="h-10 w-10 text-primary" />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="John Doe"
                  value={profile.name}
                  onChange={(e) => {
                    setProfile({ ...profile, name: e.target.value });
                    if (profileErrors.name) setProfileErrors({ ...profileErrors, name: '' });
                  }}
                />
                {profileErrors.name && (
                  <p className="text-sm text-destructive mt-1">{profileErrors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={profile.email}
                  onChange={(e) => {
                    setProfile({ ...profile, email: e.target.value });
                    if (profileErrors.email) setProfileErrors({ ...profileErrors, email: '' });
                  }}
                />
                {profileErrors.email && (
                  <p className="text-sm text-destructive mt-1">{profileErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number</label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
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

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Settings
            </CardTitle>
            <CardDescription>
              Manage your organization details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Organization Name</label>
              <Input
                placeholder="My Farm Organization"
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB. Recommended 256x256px.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Timezone
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={org.timezone}
                  onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
                >
                  <option value="UTC">UTC</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Denver">America/Denver (MST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Currency
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={org.currency}
                  onChange={(e) => setOrg({ ...org, currency: e.target.value })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date Format</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={org.dateFormat}
                onChange={(e) => setOrg({ ...org, dateFormat: e.target.value })}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleOrgSave} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Organization
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
                      onToggle={() =>
                        setNotifications({
                          ...notifications,
                          [item.key]: !notifications[item.key as keyof typeof notifications],
                        })
                      }
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
                      onToggle={() =>
                        setNotifications({
                          ...notifications,
                          [item.key]: !notifications[item.key as keyof typeof notifications],
                        })
                      }
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
                    value={security.currentPassword}
                    onChange={(e) =>
                      setSecurity({ ...security, currentPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={security.newPassword}
                    onChange={(e) => {
                      setSecurity({ ...security, newPassword: e.target.value });
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
                    value={security.confirmPassword}
                    onChange={(e) => {
                      setSecurity({ ...security, confirmPassword: e.target.value });
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
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${security.twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    <Shield className={`h-5 w-5 ${security.twoFactorEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {security.twoFactorEnabled ? 'Two-Factor is Enabled' : 'Two-Factor is Disabled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {security.twoFactorEnabled
                        ? 'Your account is secured with 2FA'
                        : 'Enable 2FA for additional security'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {security.twoFactorEnabled && (
                    <Badge variant="success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  )}
                  <Button
                    variant={security.twoFactorEnabled ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => {
                      setSecurity({ ...security, twoFactorEnabled: !security.twoFactorEnabled });
                      toast({
                        type: 'success',
                        title: security.twoFactorEnabled ? '2FA disabled' : '2FA enabled',
                        message: security.twoFactorEnabled
                          ? 'Two-factor authentication has been disabled'
                          : 'Two-factor authentication has been enabled',
                      });
                    }}
                  >
                    {security.twoFactorEnabled ? 'Disable' : 'Enable'}
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
              <Button size="sm" onClick={() => setShowNewKeyForm(!showNewKeyForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Key
              </Button>
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
                    <Button size="sm" onClick={handleAddApiKey}>Create Key</Button>
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
                      weather: Cloud,
                      payment: CreditCard,
                      sms: Bell,
                      maps: MapPin,
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
                            <Badge variant={apiKey.enabled ? 'success' : 'secondary'}>
                              {apiKey.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {showApiKey === apiKey.id ? apiKey.key : '••••••••••••••••'}
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
                            {showApiKey === apiKey.id && (
                              <button
                                onClick={() => handleCopyKey(apiKey.key)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Copy"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last used: {apiKey.lastUsed}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            enabled={apiKey.enabled}
                            onToggle={() => handleToggleApiKey(apiKey.id)}
                          />
                          <button
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Connected Services
              </CardTitle>
              <CardDescription>
                Manage third-party service integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[
                  { name: 'Google Maps', description: 'Geolocation and mapping services', connected: true },
                  { name: 'OpenWeather', description: 'Weather data and forecasts', connected: true },
                  { name: 'Stripe', description: 'Payment processing', connected: false },
                  { name: 'Twilio', description: 'SMS and voice notifications', connected: false },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <Button
                      variant={service.connected ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => {
                        toast({
                          type: 'success',
                          title: service.connected ? 'Disconnected' : 'Connected',
                          message: `${service.name} has been ${service.connected ? 'disconnected' : 'connected'}.`,
                        });
                      }}
                    >
                      {service.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
