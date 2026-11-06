import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ExpenseRepository,
  SaleRepository,
  ContractRepository,
  BuyerRepository,
  MarketListingRepository,
  FarmLookupRepository,
} from '../../domain/repositories/finance.repository';
import { FinanceEventService } from '../../infrastructure/messaging/finance.event.service';
import { CurrencyApplicationService } from '../../currency/application/services/currency.service';

@Injectable()
export class FinanceApplicationService {
  constructor(
    @Inject('ExpenseRepository') private readonly expenseRepo: ExpenseRepository,
    @Inject('SaleRepository') private readonly saleRepo: SaleRepository,
    @Inject('ContractRepository') private readonly contractRepo: ContractRepository,
    @Inject('BuyerRepository') private readonly buyerRepo: BuyerRepository,
    @Inject('MarketListingRepository') private readonly marketListingRepo: MarketListingRepository,
    @Inject('FarmLookupRepository') private readonly farmLookupRepo: FarmLookupRepository,
    private readonly currencyService: CurrencyApplicationService,
    private readonly eventService: FinanceEventService,
  ) {}

  private async assertFarmExists(farmId: string, organizationId: string) {
    const farm = await this.farmLookupRepo.findById(farmId, organizationId);
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found`);
  }

  private async assertBuyerExists(buyerId: string, organizationId: string) {
    const buyer = await this.buyerRepo.findById(buyerId, organizationId);
    if (!buyer) throw new NotFoundException(`Buyer with ID ${buyerId} not found`);
  }

  private async assertBudgetCategoryExists(categoryId: string, organizationId: string) {
    const { prisma } = await import('@farm/database');
    const category = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, budget: { organizationId } },
      select: { id: true },
    });
    if (!category) throw new NotFoundException(`Budget category with ID ${categoryId} not found`);
  }

  private toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  /**
   * Recompute `spentAmount` for every budget of the organization so budget
   * accounting always matches the finance ledger. Runs after each expense
   * change; best-effort so a budget hiccup never blocks the expense itself.
   */
  private async syncBudgetsWithExpenses(organizationId: string) {
    try {
      const { prisma } = await import('@farm/database');
      const budgets = await prisma.budget.findMany({
        where: { organizationId },
        select: { id: true },
      });
      for (const budget of budgets) {
        await this.refreshBudget(budget.id, organizationId);
      }
    } catch {
      // Budget sync must not fail the expense mutation that triggered it.
    }
  }

  // ── Expense CRUD ──────────────────────────────────────

  async createExpense(data: { farmId: string; title: string; amount: number; taxRate?: number; taxAmount?: number; currency?: string; date: Date | string; budgetCategoryId?: string | null },  organizationId: string) {
    await this.assertFarmExists(data.farmId, organizationId);
    if (data.budgetCategoryId) await this.assertBudgetCategoryExists(data.budgetCategoryId, organizationId);
    const transactionDate = this.toDate(data.date);
    const taxRate = data.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? Number((data.amount * taxRate / 100).toFixed(2));
    const { convertedAmount: amountInBase, rate } = await this.currencyService.convertToOrganizationBaseAt(
      data.amount,
      data.currency ?? 'USD',
      organizationId,
      transactionDate,
    );
    const expense = await this.expenseRepo.create({
      farmId: data.farmId,
      organizationId,
      title: data.title,
      amount: data.amount,
      taxRate,
      taxAmount,
      currency: data.currency ?? 'USD',
      amountInBase,
      rate,
      convertedAt: transactionDate,
      date: transactionDate,
      status: 'POSTED',
      sourceContractId: null,
      budgetCategoryId: data.budgetCategoryId || null,
    });
    await this.eventService.emitExpenseCreatedEvent(expense);
    await this.syncBudgetsWithExpenses(organizationId);
    return expense;
  }

  async getExpenseById(id: string, organizationId: string) {
    const expense = await this.expenseRepo.findById(id, organizationId);
    if (!expense) throw new NotFoundException(`Expense with ID ${id} not found`);
    return expense;
  }

  async getAllExpenses(
    filter: { organizationId?: string; farmId?: string; search?: string } = {},
    sortBy: string = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20,
  ) {
    return this.expenseRepo.findAll({ filter, sortBy, sortOrder, page, limit });
  }

  async updateExpense(id: string, organizationId: string, data: { farmId?: string; title?: string; amount?: number; date?: Date | string; budgetCategoryId?: string | null }) {
    await this.getExpenseById(id, organizationId);
    if (data.farmId) await this.assertFarmExists(data.farmId, organizationId);
    if (data.budgetCategoryId) await this.assertBudgetCategoryExists(data.budgetCategoryId, organizationId);
    // Currency is immutable after creation: existing ledger rows keep their
    // originally recorded currency. Never allow it to be changed on update.
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.currency;
    if (data.date) updateData.date = this.toDate(data.date);
    const expense = await this.expenseRepo.update(id, updateData);
    await this.eventService.emitExpenseUpdatedEvent(expense);
    await this.syncBudgetsWithExpenses(organizationId);
    return expense;
  }

  async deleteExpense(id: string, organizationId: string) {
    await this.getExpenseById(id, organizationId);
    await this.expenseRepo.delete(id);
    await this.eventService.emitExpenseDeletedEvent(id, organizationId);
    await this.syncBudgetsWithExpenses(organizationId);
    return { deleted: true };
  }

  // ── Sale CRUD ─────────────────────────────────────────

  async createSale(data: { farmId: string; item: string; quantity: number; price: number; total: number; taxRate?: number; taxAmount?: number; currency?: string; date: Date | string }, organizationId: string) {
    await this.assertFarmExists(data.farmId, organizationId);
    const transactionDate = this.toDate(data.date);
    const taxRate = data.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? Number((data.total * taxRate / 100).toFixed(2));
    const { convertedAmount: amountInBase, rate } = await this.currencyService.convertToOrganizationBaseAt(
      data.total,
      data.currency ?? 'USD',
      organizationId,
      transactionDate,
    );
    const sale = await this.saleRepo.create({
      farmId: data.farmId,
      organizationId,
      item: data.item,
      quantity: data.quantity,
      price: data.price,
      total: data.total,
      taxRate,
      taxAmount,
      currency: data.currency ?? 'USD',
      amountInBase,
      rate,
      convertedAt: transactionDate,
      date: transactionDate,
      status: 'POSTED',
      sourceContractId: null,
    });
    await this.eventService.emitSaleCreatedEvent(sale);
    return sale;
  }

  async getSaleById(id: string, organizationId: string) {
    const sale = await this.saleRepo.findById(id, organizationId);
    if (!sale) throw new NotFoundException(`Sale with ID ${id} not found`);
    return sale;
  }

  async getAllSales(
    filter: { organizationId?: string; farmId?: string; search?: string } = {},
    sortBy: string = 'date',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20,
  ) {
    return this.saleRepo.findAll({ filter, sortBy, sortOrder, page, limit });
  }

  async updateSale(id: string, organizationId: string, data: { farmId?: string; item?: string; quantity?: number; price?: number; total?: number; date?: Date | string }) {
    await this.getSaleById(id, organizationId);
    if (data.farmId) await this.assertFarmExists(data.farmId, organizationId);
    // Currency is immutable after creation: existing ledger rows keep their
    // originally recorded currency. Never allow it to be changed on update.
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.currency;
    if (data.date) updateData.date = this.toDate(data.date);
    const sale = await this.saleRepo.update(id, updateData);
    await this.eventService.emitSaleUpdatedEvent(sale);
    return sale;
  }

  async deleteSale(id: string, organizationId: string) {
    await this.getSaleById(id, organizationId);
    await this.saleRepo.delete(id);
    await this.eventService.emitSaleDeletedEvent(id, organizationId);
    return { deleted: true };
  }

  // ── Contract CRUD ─────────────────────────────────────

  async createContract(data: { type: string; buyerSellerName: string; entityId?: string; entityType?: string; startDate: Date | string; endDate?: Date | string | null; value: number; taxRate?: number; taxAmount?: number; currency?: string; terms?: string }, organizationId: string) {
    const transactionDate = this.toDate(data.startDate);
    const taxRate = data.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? Number((data.value * taxRate / 100).toFixed(2));
    const { convertedAmount: amountInBase, rate } = await this.currencyService.convertToOrganizationBaseAt(
      data.value,
      data.currency ?? 'USD',
      organizationId,
      transactionDate,
    );
    const contract = await this.contractRepo.create({
      organizationId,
      type: data.type,
      buyerSellerName: data.buyerSellerName,
      entityId: data.entityId || null,
      entityType: data.entityType || null,
      startDate: transactionDate,
      endDate: data.endDate ? this.toDate(data.endDate) : null,
      value: Number(data.value),
      taxRate,
      taxAmount,
      currency: data.currency ?? 'USD',
      amountInBase,
      rate,
      convertedAt: transactionDate,
      status: 'DRAFT',
      terms: data.terms?.trim() || null,
      createdById: null,
      createdByName: null,
    });
    await this.eventService.emitContractCreatedEvent(contract);
    return contract;
  }

  async getContractById(id: string, organizationId: string) {
    const contract = await this.contractRepo.findById(id, organizationId);
    if (!contract) throw new NotFoundException(`Contract with ID ${id} not found`);
    return contract;
  }

  async getAllContracts(filter: { organizationId?: string; type?: string; status?: string } = {}) {
    return this.contractRepo.findAll({ filter });
  }

  async updateContract(id: string, organizationId: string, data: { type?: string; buyerSellerName?: string; startDate?: Date | string; endDate?: Date | string | null; value?: number; status?: string; terms?: string }) {
    await this.getContractById(id, organizationId);
    // Allowlist: the body is unvalidated beyond auth, so never spread it
    // straight into the update (it could carry organizationId / id).
    // Currency is immutable after creation: existing ledger rows keep their
    // originally recorded currency. Never allow it to be changed on update.
    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.buyerSellerName !== undefined) updateData.buyerSellerName = data.buyerSellerName;
    if (data.startDate) updateData.startDate = this.toDate(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? this.toDate(data.endDate) : null;
    if (data.value !== undefined) updateData.value = Number(data.value);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.terms !== undefined) updateData.terms = data.terms?.trim() || null;
    // currency / amountInBase / rate / convertedAt are write-once: never update.
    const contract = await this.contractRepo.update(id, updateData);
    await this.eventService.emitContractUpdatedEvent(contract);
    return contract;
  }

  async deleteContract(id: string, organizationId: string) {
    await this.getContractById(id, organizationId);
    await this.contractRepo.delete(id);
    await this.eventService.emitContractDeletedEvent(id, organizationId);
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

  async getBuyerById(id: string, organizationId: string) {
    const buyer = await this.buyerRepo.findById(id, organizationId);
    if (!buyer) throw new NotFoundException(`Buyer with ID ${id} not found`);
    return buyer;
  }

  async getAllBuyers(organizationId?: string) {
    return this.buyerRepo.findAll(organizationId);
  }

  async updateBuyer(id: string, organizationId: string, data: { name?: string; contactPerson?: string; email?: string; phone?: string; address?: string; type?: string; notes?: string }) {
    await this.getBuyerById(id, organizationId);
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    const buyer = await this.buyerRepo.update(id, updateData);
    await this.eventService.emitBuyerUpdatedEvent(buyer);
    return buyer;
  }

  async deleteBuyer(id: string, organizationId: string) {
    await this.getBuyerById(id, organizationId);
    await this.buyerRepo.delete(id);
    await this.eventService.emitBuyerDeletedEvent(id, organizationId);
    return { deleted: true };
  }

  // ── Market Listing CRUD ───────────────────────────────

  async createMarketListing(data: { buyerId?: string; entityType: string; entityId?: string; title: string; price: number; taxRate?: number; taxAmount?: number; currency?: string; unit?: string; quantity: number }, organizationId: string) {
    if (data.buyerId) await this.assertBuyerExists(data.buyerId, organizationId);
    const listedDate = new Date();
    const taxRate = data.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? Number((data.price * taxRate / 100).toFixed(2));
    const { convertedAmount: amountInBase, rate } = await this.currencyService.convertToOrganizationBaseAt(
      data.price,
      data.currency ?? 'USD',
      organizationId,
      listedDate,
    );
    const listing = await this.marketListingRepo.create({
      organizationId,
      buyerId: data.buyerId || null,
      entityType: data.entityType,
      entityId: data.entityId || null,
      title: data.title,
      price: Number(data.price),
      taxRate,
      taxAmount,
      currency: data.currency ?? 'USD',
      amountInBase,
      rate,
      convertedAt: listedDate,
      unit: data.unit || 'kg',
      quantity: Number(data.quantity),
      status: 'ACTIVE',
      listedDate,
      soldDate: null,
    });
    await this.eventService.emitMarketListingCreatedEvent(listing);
    return listing;
  }

  async getMarketListingById(id: string, organizationId: string) {
    const listing = await this.marketListingRepo.findById(id, organizationId);
    if (!listing) throw new NotFoundException(`Market listing with ID ${id} not found`);
    return listing;
  }

  async getAllMarketListings(filter: { organizationId?: string; status?: string; entityType?: string } = {}) {
    return this.marketListingRepo.findAll({ filter, include: { buyer: true } });
  }

  async updateMarketListing(id: string, organizationId: string, data: { entityType?: string; title?: string; price?: number; quantity?: number; unit?: string; status?: string; soldDate?: Date | string | null; listedDate?: Date | string; buyerId?: string }) {
    await this.getMarketListingById(id, organizationId);
    if (data.buyerId) await this.assertBuyerExists(data.buyerId, organizationId);
    // Allowlist — never spread the raw body (organizationId / id must not pass through).
    // Currency / amountInBase / rate / convertedAt are write-once: existing ledger
    // rows keep their originally recorded currency; never update them.
    const updateData: any = {};
    if (data.entityType !== undefined) updateData.entityType = data.entityType;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.soldDate !== undefined) updateData.soldDate = data.soldDate ? this.toDate(data.soldDate) : null;
    if (data.listedDate) updateData.listedDate = this.toDate(data.listedDate);
    if (data.buyerId !== undefined) updateData.buyerId = data.buyerId || null;
    const listing = await this.marketListingRepo.update(id, updateData);
    await this.eventService.emitMarketListingUpdatedEvent(listing);
    return listing;
  }

  async deleteMarketListing(id: string, organizationId: string) {
    await this.getMarketListingById(id, organizationId);
    await this.marketListingRepo.delete(id);
    await this.eventService.emitMarketListingDeletedEvent(id, organizationId);
    return { deleted: true };
  }

  // ── Budget CRUD ──────────────────────────────────────

  async createBudget(data: { organizationId: string; farmId?: string; name: string; description?: string; startDate: Date | string; endDate: Date | string; status?: string }) {
    if (data.farmId) await this.assertFarmExists(data.farmId, data.organizationId);
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

  async getBudgetById(id: string, organizationId: string) {
    const { prisma } = await import('@farm/database');
    const budget = await prisma.budget.findFirst({
      where: { id, organizationId },
      include: { categories: true, farm: true },
    });
    if (!budget) throw new NotFoundException(`Budget with ID ${id} not found`);
    return budget;
  }

  async getAllBudgets(filter: { organizationId?: string; farmId?: string; status?: string } = {}) {
    const { prisma } = await import('@farm/database');
    const where: Record<string, unknown> = {};
    where.organizationId = filter.organizationId || '';
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.status) where.status = filter.status;
    return prisma.budget.findMany({
      where,
      include: { categories: true, farm: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBudget(id: string, organizationId: string, data: { name?: string; description?: string; status?: string; farmId?: string; startDate?: Date | string; endDate?: Date | string }) {
    const { prisma } = await import('@farm/database');
    await this.getBudgetById(id, organizationId);
    // Allowlist — never spread the raw body (organizationId / id must not pass through).
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate) updateData.startDate = this.toDate(data.startDate);
    if (data.endDate) updateData.endDate = this.toDate(data.endDate);
    if (data.farmId !== undefined) {
      if (data.farmId) {
        await this.assertFarmExists(data.farmId, organizationId);
        updateData.farmId = data.farmId;
      } else {
        updateData.farmId = null;
      }
    }
    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: { categories: true },
    });
    await this.eventService.emitBudgetUpdatedEvent(budget);
    return budget;
  }

  async deleteBudget(id: string, organizationId: string) {
    const { prisma } = await import('@farm/database');
    await this.getBudgetById(id, organizationId);
    await prisma.budget.delete({ where: { id } });
    await this.eventService.emitBudgetDeletedEvent(id, organizationId);
    return { deleted: true };
  }

  // ── Budget categories ────────────────────────────────

  async addBudgetCategory(budgetId: string, organizationId: string, data: { name: string; budgetAmount: number }) {
    const { prisma } = await import('@farm/database');
    await this.getBudgetById(budgetId, organizationId);
    return prisma.budgetCategory.create({
      data: {
        budgetId,
        name: data.name,
        budgetAmount: Number(data.budgetAmount) || 0,
      },
    });
  }

  async updateBudgetCategory(categoryId: string, organizationId: string, data: { name?: string; budgetAmount?: number }) {
    const { prisma } = await import('@farm/database');
    const existing = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, budget: { organizationId } },
    });
    if (!existing) throw new NotFoundException(`Budget category with ID ${categoryId} not found`);

    return prisma.budgetCategory.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.budgetAmount !== undefined ? { budgetAmount: Number(data.budgetAmount) } : {}),
      },
    });
  }

  async deleteBudgetCategory(categoryId: string, organizationId: string) {
    const { prisma } = await import('@farm/database');
    const existing = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, budget: { organizationId } },
    });
    if (!existing) throw new NotFoundException(`Budget category with ID ${categoryId} not found`);

    await prisma.budgetCategory.delete({ where: { id: categoryId } });
    return { deleted: true };
  }

  /**
   * Recompute `spentAmount` for every category of a budget from the expenses
   * recorded in the budget window.
   *
   * Attribution order per expense:
   *   1. A manual link (`expense.budgetCategoryId`) wins — but only counts
   *      here if that category belongs to THIS budget; expenses linked to
   *      another budget are not double-counted by title.
   *   2. Otherwise the expense title is matched against category names: the
   *      full category name if it appears in the title, else any word of the
   *      category name of 4+ characters ("Staff Salary" matches a title
   *      containing "salary").
   *
   * Expenses that match nothing are deliberately left out: they used to be
   * spread across the categories proportionally to their budgetAmount, which
   * invented spend nobody recorded (e.g. a 260,000 salary run smearing
   * 65,000 onto "Farming Feed").
   */
  async refreshBudget(budgetId: string, organizationId: string) {
    const { prisma } = await import('@farm/database');
    const budget = await this.getBudgetById(budgetId, organizationId);
    const categories: any[] = budget.categories || [];
    if (categories.length === 0) return budget;

    const expenseWhere: Record<string, unknown> = {
      organizationId: budget.organizationId,
      date: { gte: new Date(budget.startDate), lte: new Date(budget.endDate) },
    };
    if (budget.farmId) expenseWhere.farmId = budget.farmId;

    const expenses = await prisma.expense.findMany({ where: expenseWhere });
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Expenses store `amountInBase` in the organization's base currency.
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });
    const orgCurrency = org?.currency ?? 'USD';

    const spentById = new Map<string, number>(categories.map((c) => [c.id, 0]));

    for (const expense of expenses) {
      const amount = Number(expense.amountInBase) || 0;
      const linkedId = expense.budgetCategoryId;
      if (linkedId) {
        if (spentById.has(linkedId)) {
          spentById.set(linkedId, round2((spentById.get(linkedId) || 0) + amount));
        }
        continue;
      }
      const title = String(expense.title || '').toLowerCase();
      let hit: any = null;
      let bestScore = 0;
      for (const c of categories) {
        const name = String(c.name || '').trim().toLowerCase();
        if (!name) continue;
        let score = 0;
        if (title.includes(name)) {
          score = 2;
        } else if (
          name
            .split(/\s+/)
            .some((w: string) => w.length >= 4 && title.includes(w))
        ) {
          score = 1;
        }
        if (score > bestScore) {
          bestScore = score;
          hit = c;
        }
      }
      if (hit) {
        spentById.set(hit.id, round2((spentById.get(hit.id) || 0) + amount));
      }
    }

    // Convert each category's spent (org base) into the category's own
    // currency so `spentAmount` and `budgetAmount` share a currency. Best
    // effort: if no rate exists, keep the base-currency amount.
    const spentInCategoryCurrency = new Map<string, number>();
    for (const c of categories) {
      const spentBase = spentById.get(c.id) || 0;
      if (!c.currency || c.currency === orgCurrency || spentBase === 0) {
        spentInCategoryCurrency.set(c.id, round2(spentBase));
        continue;
      }
      try {
        const { convertedAmount } = await this.currencyService.convert(
          spentBase,
          orgCurrency,
          c.currency,
        );
        spentInCategoryCurrency.set(c.id, round2(convertedAmount));
      } catch {
        spentInCategoryCurrency.set(c.id, round2(spentBase));
      }
    }

    await Promise.all(
      categories.map((c) =>
        prisma.budgetCategory.update({
          where: { id: c.id },
          data: { spentAmount: spentInCategoryCurrency.get(c.id) || 0 },
        }),
      ),
    );

    return this.getBudgetById(budgetId, organizationId);
  }

  // ── Read-time ledger conversion ───────────────────────────

  /**
   * Convert a historical ledger row's originally recorded amount to a target
   * currency using the exchange rate effective at the row's conversion time.
   * Does not mutate the row; purely a read-time presentation helper.
   */
  async convertLedger(data: {
    entityType: 'expense' | 'sale' | 'contract' | 'marketListing';
    entityId: string;
    toCurrency: string;
    organizationId: string;
  }) {
    const { entityType, entityId, toCurrency, organizationId } = data;
    let row: { amount: number; currency: string; convertedAt: Date } | null;

    switch (entityType) {
      case 'expense': {
        const e = await this.expenseRepo.findById(entityId, organizationId);
        if (!e) throw new NotFoundException(`Expense with ID ${entityId} not found`);
        row = { amount: e.amount, currency: e.currency, convertedAt: e.convertedAt };
        break;
      }
      case 'sale': {
        const s = await this.saleRepo.findById(entityId, organizationId);
        if (!s) throw new NotFoundException(`Sale with ID ${entityId} not found`);
        row = { amount: s.total, currency: s.currency, convertedAt: s.convertedAt };
        break;
      }
      case 'contract': {
        const c = await this.contractRepo.findById(entityId, organizationId);
        if (!c) throw new NotFoundException(`Contract with ID ${entityId} not found`);
        row = { amount: c.value, currency: c.currency, convertedAt: c.convertedAt };
        break;
      }
      case 'marketListing': {
        const l = await this.marketListingRepo.findById(entityId, organizationId);
        if (!l) throw new NotFoundException(`Market listing with ID ${entityId} not found`);
        row = { amount: l.price, currency: l.currency, convertedAt: l.convertedAt };
        break;
      }
    }

    const { convertedAmount, rate } = await this.currencyService.convertAt(
      row!.amount,
      row!.currency,
      toCurrency,
      row!.convertedAt,
    );

    return {
      entityType,
      entityId,
      fromCurrency: row!.currency,
      toCurrency,
      amount: row!.amount,
      rate,
      convertedAmount,
      convertedAt: row!.convertedAt,
    };
  }

  // ── Status lifecycle ──────────────────────────────────────

  private readonly validStatusTransitions: Record<string, string[]> = {
    DRAFT: ['PENDING', 'POSTED'],
    PENDING: ['DRAFT', 'POSTED'],
    POSTED: ['VOIDED'],
    VOIDED: [],
  };

  async setLedgerStatus(data: {
    entityType: 'expense' | 'sale';
    entityId: string;
    status: string;
    organizationId: string;
  }) {
    const { entityType, entityId, status: newStatus, organizationId } = data;
    const upper = String(newStatus).toUpperCase();
    if (!['DRAFT', 'PENDING', 'POSTED', 'VOIDED'].includes(upper)) {
      throw new BadRequestException(`Invalid status ${newStatus}`);
    }

    let current: string | null;
    let update: () => Promise<any>;

    switch (entityType) {
      case 'expense': {
        const e = await this.expenseRepo.findById(entityId, organizationId);
        if (!e) throw new NotFoundException(`Expense with ID ${entityId} not found`);
        current = e.status;
        const allowed = this.validStatusTransitions[current] || [];
        if (!allowed.includes(upper)) {
          throw new BadRequestException(`Cannot transition expense ${current} → ${upper}`);
        }
        update = () => this.expenseRepo.update(entityId, { status: upper });
        break;
      }
      case 'sale': {
        const s = await this.saleRepo.findById(entityId, organizationId);
        if (!s) throw new NotFoundException(`Sale with ID ${entityId} not found`);
        current = s.status;
        const allowed = this.validStatusTransitions[current] || [];
        if (!allowed.includes(upper)) {
          throw new BadRequestException(`Cannot transition sale ${current} → ${upper}`);
        }
        update = () => this.saleRepo.update(entityId, { status: upper });
        break;
      }
    }

    const result = await update();
    await this.eventService.emitLedgerStatusChangedEvent(entityType, entityId, current, upper, organizationId);
    return result;
  }

  // ── Organization base-currency change: re-denominate entire ledger ──────

  /**
   * When an organization changes its base currency, every existing ledger row
   * is re-denominated into the new base currency so the change takes effect
   * immediately across the whole org. Historical rows do NOT keep their
   * originally recorded currency — they are re-valued at the latest rate and
   * stamped with the new currency, amountInBase, rate and convertedAt.
   */
  async reconvertOrganizationLedger(organizationId: string, toCurrency: string) {
    toCurrency = toCurrency.toUpperCase();
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const convertedAt = new Date();

    const [expenses, sales, contracts, listings] = await Promise.all([
      this.expenseRepo.findMany({ where: { organizationId } }),
      this.saleRepo.findMany({ where: { organizationId } }),
      this.contractRepo.findAll({ filter: { organizationId } }),
      this.marketListingRepo.findAll({ filter: { organizationId } }),
    ]);

    // ── Expenses ──
    for (const e of expenses) {
      if (e.currency === toCurrency) continue;
      const { convertedAmount, rate } = await this.currencyService.convert(
        e.amount,
        e.currency,
        toCurrency,
      );
      await this.expenseRepo.update(e.id, {
        currency: toCurrency,
        amount: round2(convertedAmount),
        amountInBase: round2(convertedAmount),
        rate,
        convertedAt,
      });
    }

    // ── Sales ──
    for (const s of sales) {
      if (s.currency === toCurrency) continue;
      const { convertedAmount, rate } = await this.currencyService.convert(
        s.total,
        s.currency,
        toCurrency,
      );
      await this.saleRepo.update(s.id, {
        currency: toCurrency,
        total: round2(convertedAmount),
        amountInBase: round2(convertedAmount),
        rate,
        convertedAt,
      });
    }

    // ── Contracts ──
    for (const c of contracts) {
      if (c.currency === toCurrency) continue;
      const { convertedAmount, rate } = await this.currencyService.convert(
        c.value,
        c.currency,
        toCurrency,
      );
      await this.contractRepo.update(c.id, {
        currency: toCurrency,
        value: round2(convertedAmount),
        amountInBase: round2(convertedAmount),
        rate,
        convertedAt,
      });
    }

    // ── Market listings ──
    for (const l of listings) {
      if (l.currency === toCurrency) continue;
      const { convertedAmount, rate } = await this.currencyService.convert(
        l.price,
        l.currency,
        toCurrency,
      );
      await this.marketListingRepo.update(l.id, {
        currency: toCurrency,
        price: round2(convertedAmount),
        amountInBase: round2(convertedAmount),
        rate,
        convertedAt,
      });
    }

    // ── Budget categories ──
    const { prisma } = await import('@farm/database');
    const budgets = await prisma.budget.findMany({
      where: { organizationId },
      select: { id: true },
    });
    for (const budget of budgets) {
      const categories = await prisma.budgetCategory.findMany({
        where: { budgetId: budget.id },
      });
      for (const cat of categories) {
        if (cat.currency === toCurrency) continue;
        const { convertedAmount, rate } = await this.currencyService.convert(
          cat.budgetAmount,
          cat.currency,
          toCurrency,
        );
        const spentBase = Number(cat.spentAmount || 0);
        let spentConverted = 0;
        let spentRate = 1;
        if (spentBase > 0) {
          const { convertedAmount: sc, rate: sr } = await this.currencyService.convert(
            spentBase,
            cat.currency,
            toCurrency,
          );
          spentConverted = sc;
          spentRate = sr;
        }
        await prisma.budgetCategory.update({
          where: { id: cat.id },
          data: {
            currency: toCurrency,
            budgetAmount: round2(convertedAmount),
            spentAmount: round2(spentConverted),
            amountInBase: round2(spentConverted),
          },
        });
      }
    }

    return { organizationId, toCurrency, convertedAt };
  }
}
