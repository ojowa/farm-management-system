import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Livestock section (Livestock / Health / Vaccinations /
 * Weight / Breeding). Every livestock-domain screen renders the same list so the
 * section navigation stays visible and the active tab highlights via NavTabs'
 * longest-match logic (sub-pages like /livestock/breeding/new light Breeding).
 */
export const LIVESTOCK_TABS: NavTab[] = [
  { label: 'Livestock', href: '/livestock' },
  { label: 'Health', href: '/livestock/health' },
  { label: 'Vaccinations', href: '/livestock/vaccinations' },
  { label: 'Weight', href: '/livestock/weight' },
  { label: 'Breeding', href: '/livestock/breeding' },
];
