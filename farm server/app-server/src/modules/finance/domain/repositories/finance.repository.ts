import { Expense, Sale, Contract, Buyer, MarketListing } from '../entities/finance.entity';

export interface ExpenseRepository {
  findById(id: string): Promise<Expense | null>;
  findAll(options?: {
    filter?: { farmId?: string; search?: string };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Expense[]; total: number; page: number; totalPages: number }>;
  create(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
  update(id: string, data: Partial<Expense>): Promise<Expense>;
  delete(id: string): Promise<void>;
}

export interface SaleRepository {
  findById(id: string): Promise<Sale | null>;
  findAll(options?: {
    filter?: { farmId?: string; search?: string };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Sale[]; total: number; page: number; totalPages: number }>;
  create(data: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale>;
  update(id: string, data: Partial<Sale>): Promise<Sale>;
  delete(id: string): Promise<void>;
}

export interface ContractRepository {
  findById(id: string): Promise<Contract | null>;
  findAll(options?: {
    filter?: { organizationId?: string; type?: string; status?: string };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Contract[]>;
  create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract>;
  update(id: string, data: Partial<Contract>): Promise<Contract>;
  delete(id: string): Promise<void>;
}

export interface BuyerRepository {
  findById(id: string): Promise<Buyer | null>;
  findAll(organizationId?: string): Promise<Buyer[]>;
  create(data: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Buyer>;
  update(id: string, data: Partial<Buyer>): Promise<Buyer>;
  delete(id: string): Promise<void>;
}

export interface MarketListingRepository {
  findById(id: string): Promise<MarketListing | null>;
  findAll(options?: {
    filter?: { organizationId?: string; status?: string; entityType?: string };
    include?: { buyer?: boolean };
  }): Promise<MarketListing[]>;
  create(data: {
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
  }): Promise<MarketListing>;
  update(id: string, data: Record<string, any>): Promise<MarketListing>;
  delete(id: string): Promise<void>;
}

export interface FarmLookupRepository {
  findById(id: string): Promise<{ id: string } | null>;
}
