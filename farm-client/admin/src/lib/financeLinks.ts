export interface TransactionDraft {
  type: 'expense' | 'sale';
  title?: string;
  item?: string;
  amount?: number | string;
  quantity?: number | string;
  price?: number | string;
  total?: number | string;
  date?: string;
  farmId?: string;
}

/**
 * Builds a link to the New Transaction form with the fields prefilled. Used by
 * contracts and marketplace rows so they can be posted into the finance
 * ledger, which still requires the user to pick the farm.
 */
export function transactionDraftUrl(draft: TransactionDraft): string {
  const params = new URLSearchParams();
  params.set('type', draft.type);
  Object.entries(draft).forEach(([key, value]) => {
    if (key === 'type' || value === undefined || value === null || value === '') {
      return;
    }
    params.set(key, String(value));
  });
  return `/finance/transactions/new?${params.toString()}`;
}
