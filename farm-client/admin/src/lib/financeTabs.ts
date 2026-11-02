import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Finance section (Overview / All Sales / Salary /
 * Budgets / Profitability / Reports). Transactions and the transaction form
 * stay under Overview, which NavTabs' prefix matching handles.
 */
export const FINANCE_TABS: NavTab[] = [
  { label: 'Overview', href: '/finance' },
  { label: 'All Sales', href: '/finance/sales' },
  { label: 'Salary', href: '/finance/salary' },
  { label: 'Budgets', href: '/finance/budgets' },
  { label: 'Profitability', href: '/finance/profitability' },
  { label: 'Reports', href: '/finance/reports' },
];
