import type { NavTab } from '@/components/NavTabs';

/**
 * Shared tab bar for the Finance section. Contracts and Marketplace live
 * outside /finance but feed the money summaries here and can be posted into
 * the ledger, so they are included. The transaction form and edit pages stay
 * under All Transactions, which NavTabs' prefix matching handles.
 */
export const FINANCE_TABS: NavTab[] = [
  { label: 'Overview', href: '/finance' },
  { label: 'All Transactions', href: '/finance/transactions' },
  { label: 'All Sales', href: '/finance/sales' },
  { label: 'Salary', href: '/finance/salary' },
  { label: 'Budgets', href: '/finance/budgets' },
  { label: 'Profitability', href: '/finance/profitability' },
  { label: 'Reports', href: '/finance/reports' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'Marketplace', href: '/marketplace' },
];
