import type { ElementType } from 'react';
import { Tractor, Beef, Egg, Droplets, Fish } from 'lucide-react';

/**
 * Canonical farm types for the admin app — the single source of truth for
 * every farms-section picker, label, badge, and color. Kept in lockstep with
 * FARM_TYPES in the server's database features module and the mobile app's
 * src/core/farmTypes.ts.
 *
 * All five types are first-class catalog entries. Which of them a plan may
 * CREATE is decided server-side from the plan's modules — DAIRY rides the
 * livestock module, AQUACULTURE rides aquaculture — and arrives as
 * `user.planFeatures.farmTypes`; filter pickers with `farmTypesForPlan`.
 */
export const FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'] as const;

export type FarmType = (typeof FARM_TYPES)[number];

export interface FarmTypeMeta {
  value: FarmType;
  label: string;
  /** Tailwind badge classes (list badge, detail badge, map pin). */
  color: string;
  icon: ElementType;
  /** Plan module that backs this type (`null` = core `farm` module only). */
  module: string | null;
}

export const FARM_TYPE_META: Record<FarmType, FarmTypeMeta> = {
  CROP: { value: 'CROP', label: 'Crop', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: Tractor, module: 'crop' },
  LIVESTOCK: { value: 'LIVESTOCK', label: 'Livestock', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Beef, module: 'livestock' },
  POULTRY: { value: 'POULTRY', label: 'Poultry', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Egg, module: 'poultry' },
  DAIRY: { value: 'DAIRY', label: 'Dairy', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Droplets, module: 'livestock' },
  AQUACULTURE: { value: 'AQUACULTURE', label: 'Aquaculture', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Fish, module: 'aquaculture' },
};

/** Rows over every canonical type — for maps, filters, and badge lookups. */
export const FARM_TYPE_ROWS: FarmTypeMeta[] = FARM_TYPES.map((value) => FARM_TYPE_META[value]);

/** `{ value, label }` options for Select pickers. */
export const FARM_TYPE_OPTIONS: Array<{ value: FarmType; label: string }> = FARM_TYPE_ROWS.map((t) => ({ value: t.value, label: t.label }));

export const FARM_TYPE_MAP: Record<string, FarmTypeMeta> = Object.fromEntries(FARM_TYPE_ROWS.map((t) => [t.value, t]));

/** Tailwind badge-class lookup keyed by raw farmType string. */
export const FARM_TYPE_BADGES: Record<string, string> = Object.fromEntries(FARM_TYPE_ROWS.map((t) => [t.value, t.color]));

/**
 * Farm types the caller's plan allows. Returns `undefined` when plan features
 * are absent or empty (platform admins, or a client that hasn't received
 * them) — callers treat `undefined` as "no filtering".
 */
export function farmTypesForPlan(planFeatures: { farmTypes?: string[] } | null | undefined): string[] | undefined {
  const types = planFeatures?.farmTypes;
  return Array.isArray(types) && types.length > 0 ? types : undefined;
}
