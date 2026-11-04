import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useAppSelector } from '../../modules/auth/hooks/useAuth';
import { usePermission } from '../../core/hooks/usePermission';
import { organizationsAPI } from '../../services/api';
import {
  buildDefaultConfig,
  mergeConfigWithDefaults,
  getVisibleCards,
  type DashboardCardConfig,
} from '../dashboard/cardRegistry';

/**
 * Hook that manages the organization's dashboard card configuration on mobile.
 *
 * The config lives in `Organization.settings.dashboard_config` (a JSON field
 * already on the table). It merges DB-stored overrides against the card
 * registry defaults, filters cards by the viewer's role and permissions, and
 * exposes `toggleCard` / `reorderCard` / `setCardRoles` / `saveConfig` so an
 * organization owner can customize which cards appear and who can see them.
 */
export function useDashboardConfig() {
  const { user, logout } = useAuth();
  const { hasPermission, role, permissions } = usePermission();
  const organizationId = user?.organizationId;

  // Fall back to fetching the org if it's not cached in auth state
  const [fetchedOrg, setFetchedOrg] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const rawSettings = fetchedOrg?.settings ?? {};
  const dbConfig = rawSettings.dashboard_config ?? null;

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

  // ── Ensure org data is loaded ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!organizationId) return;
      if (fetchedOrg) return;
      setLoading(true);
      try {
        const res = await organizationsAPI.get(organizationId);
        const org = (res as any)?.data ?? res;
        if (!cancelled) setFetchedOrg(org);
      } catch {
        // Best-effort; config falls back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, fetchedOrg]);

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
    if (!organizationId) throw new Error('No organization found');

    const nextSettings = {
      ...rawSettings,
      dashboard_config: workingConfig,
    };

    await organizationsAPI.update(organizationId, { settings: nextSettings });

    // Refresh org data so the new config is picked up everywhere
    try {
      const res = await organizationsAPI.get(organizationId);
      const org = (res as any)?.data ?? res;
      setFetchedOrg(org);
    } catch {
      // Non-fatal: config was saved
    }

    setWorkingConfig(config);
  }, [organizationId, rawSettings, workingConfig, config]);

  return {
    config,
    visibleCards,
    workingConfig,
    loading,
    toggleCard,
    reorderCard,
    setCardRoles,
    resetToDefaults,
    saveConfig,
  };
}
