'use client';

import { useCallback, useMemo, useState } from 'react';
import { orgAdminAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import {
  buildDefaultConfig,
  mergeConfigWithDefaults,
  getVisibleCards,
  type DashboardCardConfig,
} from '@/lib/dashboard/cardRegistry';

/**
 * Hook that manages the organization's dashboard card configuration.
 *
 * The config lives in `Organization.settings.dashboard_config` (a JSON field
 * already on the table). It merges DB-stored overrides against the card
 * registry defaults, filters cards by the viewer's role and permissions, and
 * exposes `toggleCard` / `reorderCard` / `setCardRoles` / `saveConfig` so an
 * organization owner can customize which cards appear and who can see them.
 */
export function useDashboardConfig() {
  const { hasPermission, role, permissions } = usePermission();

  const { data: orgData, loading, error, refetch } = useFetch<any>(
    'dashboard-config-org',
    () => orgAdminAPI.getOrganization(),
    { cacheTime: 60_000 },
  );

  const rawSettings = orgData?.settings ?? {};
  const dbConfig = rawSettings.dashboard_config ?? null;
  const orgCurrency = orgData?.currency ?? 'USD';

  // ── Derived config (defaults merged with DB overrides) ──────────────
  const config: Record<string, DashboardCardConfig> = useMemo(
    () => mergeConfigWithDefaults(dbConfig),
    [dbConfig],
  );

  // ── Cards visible to the current user ───────────────────────────────
  const visibleCards: DashboardCardConfig[] = useMemo(
    () => getVisibleCards(config, role, permissions, hasPermission),
    [config, role, permissions, hasPermission],
  );

  // ── Local optimistic edits (not persisted until saveConfig) ─────────
  const [workingConfig, setWorkingConfig] = useState<Record<string, DashboardCardConfig>>(() => config);

  const toggleCard = useCallback((cardId: string) => {
    setWorkingConfig((prev) => {
      const card = prev[cardId];
      if (!card) return prev;
      return { ...prev, [cardId]: { ...card, enabled: !card.enabled } };
    });
  }, []);

  const reorderCard = useCallback((cardId: string, newOrder: number) => {
    setWorkingConfig((prev) => {
      const card = prev[cardId];
      if (!card) return prev;
      return { ...prev, [cardId]: { ...card, order: newOrder } };
    });
  }, []);

  const setCardRoles = useCallback((cardId: string, roles: string[]) => {
    setWorkingConfig((prev) => {
      const card = prev[cardId];
      if (!card) return prev;
      return { ...prev, [cardId]: { ...card, roles } };
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setWorkingConfig(buildDefaultConfig());
  }, []);

  // ── Persist ─────────────────────────────────────────────────────────
  const saveConfig = useCallback(async () => {
    const orgId = orgData?.id;
    if (!orgId) throw new Error('No organization found');

    const nextSettings = {
      ...rawSettings,
      dashboard_config: workingConfig,
    };

    await orgAdminAPI.updateOrganization({ settings: nextSettings });

    // Refresh so the new config is picked up everywhere
    await refetch();
    setWorkingConfig(config);
  }, [orgData?.id, rawSettings, workingConfig, config, refetch]);

  return {
    config,
    visibleCards,
    workingConfig,
    loading,
    error,
    orgCurrency,
    toggleCard,
    reorderCard,
    setCardRoles,
    resetToDefaults,
    saveConfig,
    refetch,
  };
}
