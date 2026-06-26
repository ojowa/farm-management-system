// Finance Type Definitions

export interface Expense {
  id: string;
  farmId: string;
  title: string;
  amount: number;
  date: Date;
  createdAt: Date;
}

export interface CreateExpenseRequest {
  farmId: string;
  title: string;
  amount: number;
  date: Date | string;
}

export interface UpdateExpenseRequest {
  farmId?: string;
  title?: string;
  amount?: number;
  date?: Date | string;
}

export interface Sale {
  id: string;
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: Date;
  createdAt: Date;
}

export interface CreateSaleRequest {
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: Date | string;
}

export interface UpdateSaleRequest {
  farmId?: string;
  item?: string;
  quantity?: number;
  price?: number;
  total?: number;
  date?: Date | string;
}

