export interface Expense {
  id: string;
  organizationId: string;
  farmId: string;
  title: string;
  amount: number;
  // Tax rate (%) and computed tax amount; amount is tax-exclusive.
  taxRate: number;
  taxAmount: number;
  currency: string;
  amountInBase: number;
  // Conversion rate used at write time: 1 unit of `currency` = `rate` units of org base.
  rate: number;
  convertedAt: Date;
  date: Date;
  createdAt: Date;
  // Transaction lifecycle: DRAFT | PENDING | POSTED | VOIDED.
  status: string;
  // Source contract this row was recurrently generated from (null if manual).
  sourceContractId: string | null;
  budgetCategoryId?: string | null;
}

/** Expense rows read with the manual budget-category link joined in. */
export type ExpenseWithBudget = Expense & {
  budgetCategory?: {
    id: string;
    name: string;
    budget: { id: string; name: string };
  } | null;
};

export interface Sale {
  id: string;
  organizationId: string;
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  // Tax rate (%) and computed tax amount; total is tax-exclusive.
  taxRate: number;
  taxAmount: number;
  currency: string;
  amountInBase: number;
  // Conversion rate used at write time: 1 unit of `currency` = `rate` units of org base.
  rate: number;
  convertedAt: Date;
  date: Date;
  createdAt: Date;
  // Transaction lifecycle: DRAFT | PENDING | POSTED | VOIDED.
  status: string;
  // Source contract this row was recurrently generated from (null if manual).
  sourceContractId: string | null;
}

export interface Contract {
  id: string;
  organizationId: string;
  type: string;
  buyerSellerName: string;
  entityId: string | null;
  entityType: string | null;
  startDate: Date;
  endDate: Date | null;
  value: number;
  // Tax rate (%) and computed tax amount; value is tax-exclusive.
  taxRate: number;
  taxAmount: number;
  status: string;
  terms: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  amountInBase: number;
  // Conversion rate used at write time: 1 unit of `currency` = `rate` units of org base.
  rate: number;
  convertedAt: Date;
}

export interface Budget {
  id: string;
  organizationId: string;
  farmId: string | null;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  categories?: BudgetCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  name: string;
  currency: string;
  amountInBase: number;
  budgetAmount: number;
  spentAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Buyer {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketListing {
  id: string;
  organizationId: string;
  buyerId: string | null;
  entityType: string;
  entityId: string | null;
  title: string;
  price: number;
  // Tax rate (%) and computed tax amount; price is tax-exclusive.
  taxRate: number;
  taxAmount: number;
  currency: string;
  amountInBase: number;
  // Conversion rate used at write time: 1 unit of `currency` = `rate` units of org base.
  rate: number;
  convertedAt: Date;
  unit: string;
  quantity: number;
  status: string;
  listedDate: Date;
  soldDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
