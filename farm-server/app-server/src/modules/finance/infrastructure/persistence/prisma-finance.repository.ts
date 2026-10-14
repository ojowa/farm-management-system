import { Injectable } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';
import {
  ExpenseRepository,
  SaleRepository,
  ContractRepository,
  BuyerRepository,
  MarketListingRepository,
  FarmLookupRepository,
} from '../../domain/repositories/finance.repository';
import { Expense, Sale, Contract, Buyer, MarketListing } from '../../domain/entities/finance.entity';

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepository {
  async findById(id: string, organizationId: string): Promise<Expense | null> {
    return scopedPrisma.expense.findFirst({ where: { id, organizationId } });
  }

  async findAll(options?: {
    filter?: { organizationId?: string; farmId?: string; search?: string };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Expense[]; total: number; page: number; totalPages: number }> {
    const { filter = {}, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    // Tenancy is a plain equality filter, never a conditional: an empty org
    // string must match zero rows instead of falling through to all tenants.
    where.organizationId = filter.organizationId || '';
    if (filter.search) where.OR = [{ title: { contains: filter.search, mode: 'insensitive' as const } }];
    const [data, total] = await Promise.all([
      scopedPrisma.expense.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      scopedPrisma.expense.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findMany(options: { where: Record<string, any> }): Promise<Expense[]> {
    return scopedPrisma.expense.findMany(options);
  }

  async create(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    return scopedPrisma.expense.create({ data });
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    return scopedPrisma.expense.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await scopedPrisma.expense.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaSaleRepository implements SaleRepository {
  async findById(id: string, organizationId: string): Promise<Sale | null> {
    return scopedPrisma.sale.findFirst({ where: { id, organizationId } });
  }

  async findAll(options?: {
    filter?: { organizationId?: string; farmId?: string; search?: string };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Sale[]; total: number; page: number; totalPages: number }> {
    const { filter = {}, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    where.organizationId = filter.organizationId || '';
    if (filter.search) where.OR = [{ item: { contains: filter.search, mode: 'insensitive' as const } }];
    const [data, total] = await Promise.all([
      scopedPrisma.sale.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      scopedPrisma.sale.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findMany(options: { where: Record<string, any> }): Promise<Sale[]> {
    return scopedPrisma.sale.findMany(options);
  }

  async create(data: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    return scopedPrisma.sale.create({ data });
  }

  async update(id: string, data: Partial<Sale>): Promise<Sale> {
    return scopedPrisma.sale.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await scopedPrisma.sale.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaContractRepository implements ContractRepository {
  async findById(id: string, organizationId: string): Promise<Contract | null> {
    return scopedPrisma.contract.findFirst({ where: { id, organizationId } });
  }

  async findAll(options?: {
    filter?: { organizationId?: string; type?: string; status?: string };
  }): Promise<Contract[]> {
    const { filter = {} } = options || {};
    const where: any = {};
    where.organizationId = filter.organizationId || '';
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    return scopedPrisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
    return scopedPrisma.contract.create({ data });
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    return scopedPrisma.contract.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await scopedPrisma.contract.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaBuyerRepository implements BuyerRepository {
  async findById(id: string, organizationId: string): Promise<Buyer | null> {
    return scopedPrisma.buyer.findFirst({ where: { id, organizationId } });
  }

  async findAll(organizationId?: string): Promise<Buyer[]> {
    return scopedPrisma.buyer.findMany({
      where: { organizationId: organizationId || '' },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Buyer> {
    return scopedPrisma.buyer.create({ data });
  }

  async update(id: string, data: Partial<Buyer>): Promise<Buyer> {
    return scopedPrisma.buyer.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await scopedPrisma.buyer.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaMarketListingRepository implements MarketListingRepository {
  async findById(id: string, organizationId: string): Promise<MarketListing | null> {
    return scopedPrisma.marketListing.findFirst({ where: { id, organizationId } });
  }

  async findAll(options?: {
    filter?: { organizationId?: string; status?: string; entityType?: string };
    include?: { buyer?: boolean };
  }): Promise<MarketListing[]> {
    const { filter = {}, include } = options || {};
    const where: any = {};
    where.organizationId = filter.organizationId || '';
    if (filter.status) where.status = filter.status;
    if (filter.entityType) where.entityType = filter.entityType;
    return scopedPrisma.marketListing.findMany({
      where,
      include: include?.buyer ? { buyer: true } : undefined,
      orderBy: { listedDate: 'desc' },
    });
  }

  async create(data: {
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
  }): Promise<MarketListing> {
    return scopedPrisma.marketListing.create({ data });
  }

  async update(id: string, data: Record<string, any>): Promise<MarketListing> {
    return scopedPrisma.marketListing.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await scopedPrisma.marketListing.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaFarmLookupRepository implements FarmLookupRepository {
  async findById(id: string, organizationId: string): Promise<{ id: string } | null> {
    return scopedPrisma.farm.findFirst({ where: { id, organizationId }, select: { id: true } });
  }

  async findMany(options: { where: Record<string, any>; select?: Record<string, true> }): Promise<any[]> {
    return scopedPrisma.farm.findMany({ where: options.where, select: options.select });
  }
}
