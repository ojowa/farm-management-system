import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { scopedPrisma, runWithSoftDeleteBypass, SOFT_DELETE_MODELS } from '@farm/database';

type ScopeBuilder = (organizationId: string) => Record<string, unknown>;

/**
 * Soft-deleted tenant data recovery: list / restore / hard-purge.
 *
 * SOFT_DELETE_MODELS is the whitelist for `:model`. The 39 models that carry
 * an organizationId column are scoped by that column; the nine without one
 * (Field, PoultryHouse, Pen, the flock record children, BudgetCategory,
 * Notification) are scoped through their parent chain, so one organization
 * can never see — let alone restore or purge — another's deleted rows.
 *
 * All queries run under runWithSoftDeleteBypass, which is the only way to
 * observe or really remove soft-deleted rows through the extended client.
 */
const RELATION_SCOPES: Record<string, ScopeBuilder> = {
  Field: (o) => ({ farm: { organizationId: o } }),
  PoultryHouse: (o) => ({ farm: { organizationId: o } }),
  Pen: (o) => ({ poultryHouse: { farm: { organizationId: o } } }),
  FeedingRecord: (o) => ({ flock: { organizationId: o } }),
  VaccinationRecord: (o) => ({ flock: { organizationId: o } }),
  MortalityRecord: (o) => ({ flock: { organizationId: o } }),
  Medication: (o) => ({ flock: { organizationId: o } }),
  BudgetCategory: (o) => ({ budget: { organizationId: o } }),
  Notification: (o) => ({ user: { organizationId: o } }),
};

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('deleted-data')
export class DeletedDataController {
  @Permission('organization.read')
  @Get(':model')
  async list(@Param('model') model: string, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    const where = this.scopeWhere(model, organizationId);
    return runWithSoftDeleteBypass(() =>
      (scopedPrisma as any)[model].findMany({
        where: { ...where, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: 100,
      }),
    );
  }

  @Permission('organization.manage')
  @Post(':model/:id/restore')
  async restore(@Param('model') model: string, @Param('id') id: string, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    const existing = await this.findDeleted(model, id, organizationId);
    return runWithSoftDeleteBypass(() =>
      (scopedPrisma as any)[model].update({
        where: { id: existing.id },
        data: { deletedAt: null },
      }),
    );
  }

  @Permission('organization.manage')
  @Delete(':model/:id')
  async purge(@Param('model') model: string, @Param('id') id: string, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    const existing = await this.findDeleted(model, id, organizationId);
    return runWithSoftDeleteBypass(() =>
      (scopedPrisma as any)[model].delete({ where: { id: existing.id } }),
    );
  }

  private scopeWhere(model: string, organizationId: string): Record<string, unknown> {
    if (!SOFT_DELETE_MODELS.has(model)) throw new NotFoundException('Unknown model');
    const relationScope = RELATION_SCOPES[model];
    if (relationScope) return relationScope(organizationId);
    return { organizationId };
  }

  private async findDeleted(
    model: string,
    id: string,
    organizationId: string,
  ): Promise<{ id: string }> {
    const where = { id, deletedAt: { not: null }, ...this.scopeWhere(model, organizationId) };
    const row = await runWithSoftDeleteBypass(() =>
      (scopedPrisma as any)[model].findFirst({ where, select: { id: true } }),
    );
    if (!row) throw new NotFoundException('Deleted record not found');
    return row;
  }
}
