'use client';

import React, { useCallback } from 'react';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { DASHBOARD_CARDS, DEFAULT_CARD_ORDER, type DashboardCardConfig } from '@/lib/dashboard/cardRegistry';
import { usePermission } from '@/lib/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Plus, RefreshCw, Save, Gauge, BarChart3, Clock, List, AlertTriangle, ShieldCheck, DollarSign, Monitor } from 'lucide-react';

const ROLE_OPTIONS = ['owner', 'manager', 'accountant', 'supervisor', 'worker'];

const ICONS: Record<string, React.ElementType> = {
  'total-farms': Gauge,
  'total-crops': Gauge,
  'total-livestock': Gauge,
  'total-poultry': Gauge,
  'total-ponds': Gauge,
  'financial-summary': DollarSign,
  'profit-trend': BarChart3,
  'expense-breakdown': BarChart3,
  'todays-attendance': Clock,
  'pending-tasks': List,
  'alerts': AlertTriangle,
  'quick-actions': ShieldCheck,
  'financial-chart': BarChart3,
  'recent-activity': Monitor,
};

export default function DashboardConfigPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission('organization.manage');

  const {
    config,
    visibleCards,
    workingConfig,
    toggleCard,
    reorderCard,
    setCardRoles,
    resetToDefaults,
    saveConfig,
    loading,
    error,
  } = useDashboardConfig();

  const sortedCards = Object.values(workingConfig).sort((a, b) => a.order - b.order);

  const handleSave = useCallback(async () => {
    try {
      await saveConfig();
    } catch (err: any) {
      alert(err?.message || 'Failed to save dashboard configuration');
    }
  }, [saveConfig]);

  if (!canManage) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Configuration</CardTitle>
            <CardDescription>Organize which dashboard cards are visible and who can see them.</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            You don’t have permission to configure the dashboard. Ask your organization owner to grant you access.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Configuration</h1>
          <p className="text-muted-foreground">Enable, disable, reorder, and restrict dashboard cards by role.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={resetToDefaults} disabled={loading} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Cards</CardTitle>
          <CardDescription>Toggle cards on/off, set their display order, and choose which roles can see each card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedCards.map((card) => {
            const Icon = ICONS[card.id];
            const isVisible = visibleCards.some((vc) => vc.id === card.id);
            const isAllRoles = card.roles.length === 0;
            return (
              <Card key={card.id} className="border p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.enabled ? 'bg-blue-50 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={card.enabled}
                        onChange={() => toggleCard(card.id)}
                        className="rounded bg-background border-input text-primary focus:ring-0"
                      />
                      {card.enabled ? 'Enabled' : 'Disabled'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Order</span>
                      <Input
                        type="number"
                        value={card.order}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v)) reorderCard(card.id, v);
                        }}
                        className="w-16"
                      />
                    </div>
                    <Select
                      options={[
                        { value: '', label: 'All roles' },
                        ...ROLE_OPTIONS.map((r) => ({ value: r, label: r })),
                      ]}
                      value={isAllRoles ? '' : card.roles[0] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardRoles(card.id, val ? [val] : []);
                      }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {card.requiredPermission ? `Requires: ${card.requiredPermission}` : 'No permission required'}
                  {isVisible ? ' — visible to you' : ' — hidden from you'}
                </p>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">How it works</p>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Only cards toggled <strong>on</strong> appear on the dashboard.</li>
          <li>Cards are displayed in <strong>order</strong> (lower numbers first).</li>
          <li>If a <strong>role</strong> is selected, only users with that role see the card.</li>
          <li>Permission requirements (e.g. <code>finance.read</code>) are always enforced, regardless of role settings.</li>
        </ul>
      </div>
    </div>
  );
}
