import { Inject,  Injectable, NotFoundException } from '@nestjs/common';
import {
  ExpenseRepository,
  SaleRepository,
  ContractRepository,
  BuyerRepository,
  MarketListingRepository,
  FarmLookupRepository,
} from '../../domain/repositories/finance.repository';
import { FinanceEventService } from '../../infrastructure/messaging/finance.event.service';

@Injectable()
export class FinanceApplicationService {
  constructor(@Inject('ExpenseRepository') private readonly expenseRepo: ExpenseRepository, @Inject('SaleRepository') private readonly saleRepo: SaleRepository, @Inject('ContractRepository') private readonly contractRepo: ContractRepository, @Inject('BuyerRepository') private readonly buyerRepo: BuyerRepository, @Inject('MarketListingRepository') private readonly marketListingRepo: MarketListingRepository, @Inject('FarmLookupRepository') private readonly farmLookupRepo: FarmLookupRepository, 
    private readonly eventService: FinanceEventService, 
  ) {}

  private async assertFarmExists(farmId: string) {
    const farm = await this.farmLookupRepo.findById(farmId);
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found`);
  }

  private toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  // ── Expense CRUD ──────────────────────────────────────

  async createExpense(data: { farmId: string; title: string; amount: number; date: Date | string },  organizationId: string) {
    await this.assertFarmExists(data.farmId);
    const expense = await this.expenseRepo.create({
      farmId: data.farmId,
      organizationId,
      title: data.title,
      amount: data.amount,
      date: this.toDate(data.date),
    });
    await this.eventService.emitExpenseCreatedEvent(expense);
    return expense;
  }

  async getExpenseById(id: string) {
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundException(`Expense with ID ${id} not found`);
    return expense;
  }

  async getAllExpenses(
    filter: { farmId?: string; search?: string } = {},
    sortBy: string = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20,
  ) {
    return this.expenseRepo.findAll({ filter, sortBy, sortOrder, page, limit });
  }

  async updateExpense(id: string, data: { farmId?: string; title?: string; amount?: number; date?: Date | string }) {
    await this.getExpenseById(id);
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const updateData: any = { ...data };
    if (data.date) updateData.date = this.toDate(data.date);
    const expense = await this.expenseRepo.update(id, updateData);
    await this.eventService.emitExpenseUpdatedEvent(expense);
    return expense;
  }

  async deleteExpense(id: string) {
    await this.getExpenseById(id);
    await this.expenseRepo.delete(id);
    await this.eventService.emitExpenseDeletedEvent(id);
    return { deleted: true };
  }

  // ── Sale CRUD ─────────────────────────────────────────

  async createSale(data: { farmId: string; item: string; quantity: number; price: number; total: number; date: Date | string }, organizationId: string) {
    await this.assertFarmExists(data.farmId);
    const sale = await this.saleRepo.create({
      farmId: data.farmId,
      organizationId,
      item: data.item,
      quantity: data.quantity,
      price: data.price,
      total: data.total,
      date: this.toDate(data.date),
    });
    await this.eventService.emitSaleCreatedEvent(sale);
    return sale;
  }

  async getSaleById(id: string) {
    const sale = await this.saleRepo.findById(id);
    if (!sale) throw new NotFoundException(`Sale with ID ${id} not found`);
    return sale;
  }

  async getAllSales(
    filter: { farmId?: string; search?: string } = {},
    sortBy: string = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20,
  ) {
    return this.saleRepo.findAll({ filter, sortBy, sortOrder, page, limit });
  }

  async updateSale(id: string, data: { farmId?: string; item?: string; quantity?: number; price?: number; total?: number; date?: Date | string }) {
    await this.getSaleById(id);
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const updateData: any = { ...data };
    if (data.date) updateData.date = this.toDate(data.date);
    const sale = await this.saleRepo.update(id, updateData);
    await this.eventService.emitSaleUpdatedEvent(sale);
    return sale;
  }

  async deleteSale(id: string) {
    await this.getSaleById(id);
    await this.saleRepo.delete(id);
    await this.eventService.emitSaleDeletedEvent(id);
    return { deleted: true };
  }

  // ── Contract CRUD ─────────────────────────────────────

  async createContract(data: { type: string; buyerSellerName: string; entityId?: string; entityType?: string; startDate: Date | string; endDate?: Date | string | null; value: number; terms?: string }, organizationId: string) {
    const contract = await this.contractRepo.create({
      organizationId,
      type: data.type,
      buyerSellerName: data.buyerSellerName,
      entityId: data.entityId || null,
      entityType: data.entityType || null,
      startDate: this.toDate(data.startDate),
      endDate: data.endDate ? this.toDate(data.endDate) : null,
      value: Number(data.value),
      status: 'DRAFT',
      terms: data.terms?.trim() || null,
      createdById: null,
      createdByName: null,
    });
    await this.eventService.emitContractCreatedEvent(contract);
    return contract;
  }

  async getContractById(id: string) {
    const contract = await this.contractRepo.findById(id);
    if (!contract) throw new NotFoundException(`Contract with ID ${id} not found`);
    return contract;
  }

  async getAllContracts(filter: { organizationId?: string; type?: string; status?: string } = {}) {
    return this.contractRepo.findAll({ filter });
  }

  async updateContract(id: string, data: { type?: string; buyerSellerName?: string; startDate?: Date | string; endDate?: Date | string | null; value?: number; status?: string; terms?: string }) {
    await this.getContractById(id);
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = this.toDate(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? this.toDate(data.endDate) : null;
    if (data.value !== undefined) updateData.value = Number(data.value);
    if (data.terms !== undefined) updateData.terms = data.terms?.trim() || null;
    const contract = await this.contractRepo.update(id, updateData);
    await this.eventService.emitContractUpdatedEvent(contract);
    return contract;
  }

  async deleteContract(id: string) {
    await this.getContractById(id);
    await this.contractRepo.delete(id);
    await this.eventService.emitContractDeletedEvent(id);
    return { deleted: true };
  }

  // ── Buyer CRUD ────────────────────────────────────────

  async createBuyer(data: { name: string; contactPerson?: string; email?: string; phone?: string; address?: string; type?: string; notes?: string }, organizationId: string) {
    const buyer = await this.buyerRepo.create({
      organizationId,
      name: data.name,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      type: data.type || 'INDIVIDUAL',
      notes: data.notes?.trim() || null,
    });
    await this.eventService.emitBuyerCreatedEvent(buyer);
    return buyer;
  }

  async getBuyerById(id: string) {
    const buyer = await this.buyerRepo.findById(id);
    if (!buyer) throw new NotFoundException(`Buyer with ID ${id} not found`);
    return buyer;
  }

  async getAllBuyers(organizationId?: string) {
    return this.buyerRepo.findAll(organizationId);
  }

  async updateBuyer(id: string, data: { name?: string; contactPerson?: string; email?: string; phone?: string; address?: string; type?: string; notes?: string }) {
    await this.getBuyerById(id);
    const updateData: any = { ...data };
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    const buyer = await this.buyerRepo.update(id, updateData);
    await this.eventService.emitBuyerUpdatedEvent(buyer);
    return buyer;
  }

  async deleteBuyer(id: string) {
    await this.getBuyerById(id);
    await this.buyerRepo.delete(id);
    await this.eventService.emitBuyerDeletedEvent(id);
    return { deleted: true };
  }

  // ── Market Listing CRUD ───────────────────────────────

  async createMarketListing(data: { buyerId?: string; entityType: string; entityId?: string; title: string; price: number; unit?: string; quantity: number }, organizationId: string) {
    const listing = await this.marketListingRepo.create({
      organizationId,
      buyerId: data.buyerId || null,
      entityType: data.entityType,
      entityId: data.entityId || null,
      title: data.title,
      price: Number(data.price),
      unit: data.unit || 'kg',
      quantity: Number(data.quantity),
      status: 'ACTIVE',
      listedDate: new Date(),
      soldDate: null,
    });
    await this.eventService.emitMarketListingCreatedEvent(listing);
    return listing;
  }

  async getMarketListingById(id: string) {
    const listing = await this.marketListingRepo.findById(id);
    if (!listing) throw new NotFoundException(`Market listing with ID ${id} not found`);
    return listing;
  }

  async getAllMarketListings(filter: { organizationId?: string; status?: string; entityType?: string } = {}) {
    return this.marketListingRepo.findAll({ filter, include: { buyer: true } });
  }

  async updateMarketListing(id: string, data: { status?: string; soldDate?: Date | string | null; price?: number; quantity?: number }) {
    await this.getMarketListingById(id);
    const updateData: any = { ...data };
    if (data.soldDate !== undefined) updateData.soldDate = data.soldDate ? this.toDate(data.soldDate) : null;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    const listing = await this.marketListingRepo.update(id, updateData);
    await this.eventService.emitMarketListingUpdatedEvent(listing);
    return listing;
  }

  async deleteMarketListing(id: string) {
    await this.getMarketListingById(id);
    await this.marketListingRepo.delete(id);
    await this.eventService.emitMarketListingDeletedEvent(id);
    return { deleted: true };
  }

  // ── Budget CRUD ──────────────────────────────────────

  async createBudget(data: { organizationId: string; farmId?: string; name: string; description?: string; startDate: Date | string; endDate: Date | string; status?: string }) {
    const { prisma } = await import('@farm/database');
    const budget = await prisma.budget.create({
      data: {
        organizationId: data.organizationId,
        farmId: data.farmId || null,
        name: data.name,
        description: data.description || null,
        startDate: this.toDate(data.startDate),
        endDate: this.toDate(data.endDate),
        status: data.status || 'ACTIVE',
      },
    });
    await this.eventService.emitBudgetCreatedEvent(budget);
    return budget;
  }

  async getBudgetById(id: string) {
    const { prisma } = await import('@farm/database');
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: { categories: true, farm: true },
    });
    if (!budget) throw new NotFoundException(`Budget with ID ${id} not found`);
    return budget;
  }

  async getAllBudgets(filter: { organizationId?: string; farmId?: string; status?: string } = {}) {
    const { prisma } = await import('@farm/database');
    const where: Record<string, unknown> = {};
    if (filter.organizationId) where.organizationId = filter.organizationId;
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.status) where.status = filter.status;
    return prisma.budget.findMany({
      where,
      include: { categories: true, farm: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBudget(id: string, data: { name?: string; description?: string; status?: string; farmId?: string }) {
    const { prisma } = await import('@farm/database');
    await this.getBudgetById(id);
    const budget = await prisma.budget.update({
      where: { id },
      data,
      include: { categories: true },
    });
    await this.eventService.emitBudgetUpdatedEvent(budget);
    return budget;
  }

  async deleteBudget(id: string) {
    const { prisma } = await import('@farm/database');
    await this.getBudgetById(id);
    await prisma.budget.delete({ where: { id } });
    await this.eventService.emitBudgetDeletedEvent(id);
    return { deleted: true };
  }
}
