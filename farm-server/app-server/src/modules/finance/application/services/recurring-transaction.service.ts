import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ExpenseRepository,
  SaleRepository,
  ContractRepository,
  FarmLookupRepository,
} from '../../domain/repositories/finance.repository';
import { FinanceApplicationService } from './finance.service';

const MONTH_FORMAT = (d: Date) => d.toISOString().slice(0, 7); // YYYY-MM

@Injectable()
export class RecurringTransactionService {
  constructor(
    @Inject('ExpenseRepository') private readonly expenseRepo: ExpenseRepository,
    @Inject('SaleRepository') private readonly saleRepo: SaleRepository,
    @Inject('ContractRepository') private readonly contractRepo: ContractRepository,
    @Inject('FarmLookupRepository') private readonly farmLookupRepo: FarmLookupRepository,
    private readonly finance: FinanceApplicationService,
  ) {}

  /**
   * Generate draft transactions from active contracts for the given farm and
   * month. Each contract yields one row per month (BUY → expense, SELL →
   * sale). Already-generated rows for the same contract/month are skipped.
   */
  async generateFromContracts(data: {
    organizationId: string;
    farmId: string;
    asOfDate?: Date | string;
  }) {
    const { organizationId, farmId } = data;
    const asOf = data.asOfDate ? new Date(data.asOfDate) : new Date();
    const month = MONTH_FORMAT(asOf);

    const farm = await this.farmLookupRepo.findById(farmId, organizationId);
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found`);

    const contracts = await this.contractRepo.findAll({
      filter: { organizationId, status: 'ACTIVE' },
    });

    const generated: any[] = [];
    const skipped: string[] = [];

    for (const contract of contracts) {
      if (!contract.startDate || contract.startDate > asOf) continue;
      if (contract.endDate && contract.endDate < asOf) continue;

      // Dedup: skip if a row from this contract already exists this month.
      const existing = await this.findGeneratedForContractMonth(
        contract.id,
        organizationId,
        month,
      );
      if (existing) {
        skipped.push(contract.id);
        continue;
      }

      const title = `Recurring: ${contract.buyerSellerName}`;
      const amount = Number(contract.value || 0);
      const currency = contract.currency ?? 'USD';

      if (contract.type === 'SELL') {
        const sale = await this.finance.createSale(
          {
            farmId,
            item: title,
            quantity: 1,
            price: amount,
            total: amount,
            currency,
            date: asOf,
            taxRate: contract.taxRate,
            taxAmount: contract.taxAmount,
          },
          organizationId,
        );
        await this.saleRepo.update(sale.id, { sourceContractId: contract.id });
        generated.push({ type: 'sale', id: sale.id, contractId: contract.id });
      } else {
        const expense = await this.finance.createExpense(
          {
            farmId,
            title,
            amount,
            currency,
            date: asOf,
            taxRate: contract.taxRate,
            taxAmount: contract.taxAmount,
          },
          organizationId,
        );
        await this.expenseRepo.update(expense.id, { sourceContractId: contract.id });
        generated.push({ type: 'expense', id: expense.id, contractId: contract.id });
      }
    }

    return { generated, skipped, month, farmId, asOf: asOf.toISOString() };
  }

  private async findGeneratedForContractMonth(
    contractId: string,
    organizationId: string,
    month: string,
  ) {
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    const [expense, sale] = await Promise.all([
      this.expenseRepo.findMany({
        where: {
          organizationId,
          sourceContractId: contractId,
          date: { gte: new Date(monthStart), lte: new Date(monthEnd) },
        },
      }),
      this.saleRepo.findMany({
        where: {
          organizationId,
          sourceContractId: contractId,
          date: { gte: new Date(monthStart), lte: new Date(monthEnd) },
        },
      }),
    ]);
    return expense[0] ?? sale[0] ?? null;
  }
}
