import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Finance section. Contracts and Marketplace live
 * outside /finance but feed the money summaries here and can be posted into
 * the ledger, so they are included. Transactions and the transaction form
 * stay under Overview, which NavTabs' prefix matching handles.
 */
export const FINANCE_TABS: NavTab[] = [
  { label: 'Overview', href: '/finance' },
  { label: 'All Sales', href: '/finance/sales' },
  { label: 'Salary', href: '/finance/salary' },
  { label: 'Budgets', href: '/finance/budgets' },
  { label: 'Profitability', href: '/finance/profitability' },
  { label: 'Reports', href: '/finance/reports' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'Marketplace', href: '/marketplace' },
];
