// Placeholder for Finance types
export interface Transaction {
  id: string;
  farmId: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  currency: string;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
