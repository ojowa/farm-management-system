export interface Expense {
  id: string;
  organizationId: string;
  farmId: string;
  title: string;
  amount: number;
  date: Date;
  createdAt: Date;
}

export interface Sale {
  id: string;
  organizationId: string;
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: Date;
  createdAt: Date;
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
  status: string;
  terms: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  unit: string;
  quantity: number;
  status: string;
  listedDate: Date;
  soldDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
