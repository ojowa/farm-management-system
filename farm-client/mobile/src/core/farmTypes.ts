/**
 * Canonical farm types for the mobile app — the single source of truth for
 * farm pickers, labels, and badge colors. Kept in lockstep with FARM_TYPES
 * in the server's database features module and the admin app's
 * farm-client/admin/src/lib/farmTypes.ts.
 *
 * All five types are first-class catalog entries (a type doesn't need its own
 * module to exist). Which of them a plan may CREATE is decided server-side
 * from the plan's modules — DAIRY rides the livestock module, AQUACULTURE
 * rides core `farm` — and arrives as `user.planFeatures.farmTypes`.
 */
export const FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'] as const;

export type FarmType = (typeof FARM_TYPES)[number];

export const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

export const FARM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  CROP: { bg: '#DCFCE7', text: '#166534' },
  LIVESTOCK: { bg: '#FEF3C7', text: '#92400E' },
  POULTRY: { bg: '#FFEDD5', text: '#9A3412' },
  DAIRY: { bg: '#DBEAFE', text: '#1E40AF' },
  AQUACULTURE: { bg: '#CFFAFE', text: '#155E75' },
};
