/**
 * Finance module — transactions (expenses + sales), contracts, marketplace
 * and profitability. Mirrors the admin portal's `finance` plan-module.
 *
 * Single facade over the three data layers a screen might use:
 *   - online API   (`financeAPI`, `expensesAPI`, `salesAPI`, …)
 *   - offline API  (`offlineFinanceAPI`, queues writes when disconnected)
 *   - RTK Query   (`financeApi` + its generated hooks)
 */
export {
  financeAPI,
  expensesAPI,
  salesAPI,
  contractsAPI,
  marketplaceAPI,
  profitabilityAPI,
} from '../../services/api';
export { offlineFinanceAPI } from '../../services/offlineApi';
export {
  financeApi,
  useListExpensesQuery,
  useListSalesQuery,
  useCreateExpenseMutation,
  useCreateSaleMutation,
} from '../../store/api';
export type {
  Expense,
  CreateExpenseRequest,
  Sale,
  CreateSaleRequest,
  Contract,
  ContractStatus,
  Buyer,
  MarketListing,
  ProfitabilitySummary,
  FarmProfitability,
} from '../../services/types';
