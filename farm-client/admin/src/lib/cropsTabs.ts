import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Crops section (Cycles / Crop Catalog / Calendar /
 * Pest & Disease / Irrigation). Every crops-domain screen renders the same list so the section
 * navigation stays visible and the active tab highlights via NavTabs' longest-
 * match logic. Irrigation lives at `/irrigation` (gated by crop.read) but is
 * part of this section, so it carries the same tabs.
 */
export const CROPS_TABS: NavTab[] = [
  { label: 'Cycles', href: '/crops' },
  { label: 'Crop Catalog', href: '/crops/catalog' },
  { label: 'Calendar', href: '/crops/calendar' },
  { label: 'Pest & Disease', href: '/crops/pest-disease' },
  { label: 'Irrigation', href: '/irrigation' },
];
