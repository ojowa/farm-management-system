import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Poultry section (Poultry / Flocks / Houses & Pens /
 * Feeding / Vaccinations / Medications / Mortality / Egg Production / Sales).
 * Mirrors the Crops and Livestock sections: every poultry-domain screen renders
 * the same list so the section navigation stays visible, and NavTabs' longest-
 * match logic lights exactly one tab — a detail page like /poultry/houses/abc
 * lights "Houses & Pens" rather than the "Poultry" root.
 *
 * The first entry is the hub at /poultry (the card grid behind the sidebar's
 * Poultry link); the rest mirror the cards on that hub, so the tab bar and the
 * hub can't disagree about where a section lives.
 */
export const POULTRY_TABS: NavTab[] = [
  { label: 'Poultry', href: '/poultry' },
  { label: 'Flocks', href: '/poultry/flocks' },
  { label: 'Houses & Pens', href: '/poultry/houses' },
  { label: 'Feeding', href: '/poultry/feeding' },
  { label: 'Vaccinations', href: '/poultry/vaccinations' },
  { label: 'Medications', href: '/poultry/medications' },
  { label: 'Mortality', href: '/poultry/mortality' },
  { label: 'Egg Production', href: '/poultry/egg-production' },
  { label: 'Sales', href: '/poultry/sales' },
];
