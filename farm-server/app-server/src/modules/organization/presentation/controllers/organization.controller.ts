import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '../../../../kernel/auth/nestjs';
import { OrganizationApplicationService } from '../../application/services/organization.service';
import { Organization } from '../../domain/entities/organization.entity';
import { ZodValidationPipe } from '../../../../kernel/utils';
import { createOrganizationSchema, updateOrganizationSchema } from '../../../../kernel/validation';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationApplicationService) {}

  @Permission('organization.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(@Body() createDto: any): Promise<Organization> {
    return this.organizationService.create(createDto);
  }

  @Permission('organization.read')
  @Get('subscription-plans')
  async getSubscriptionPlans() {
    return this.organizationService.getSubscriptionPlans();
  }

  // Owner-only billing views. Declared before @Get(':id') so "subscription"
  // is never captured as an :id; gated by billing.manage (ORGANIZATION_OWNER).
  @Permission('billing.manage')
  @Get('subscription')
  async getSubscription(@Req() req: any) {
    return this.organizationService.getSubscription(String(req.user?.organizationId || ''));
  }

  @Permission('billing.manage')
  @Patch('subscription')
  async changeSubscription(@Req() req: any, @Body() body: { planId?: string }) {
    return this.organizationService.changeSubscriptionPlan(
      String(req.user?.organizationId || ''),
      String(body?.planId || ''),
    );
  }

  // Paystack billing endpoints. All owner-only (billing.manage) and declared
  // before @Get(':id') so no path segment is ever captured as an :id.
  @Permission('billing.manage')
  @Post('subscription/checkout')
  async startCheckout(@Req() req: any, @Body() body: { planId?: string }) {
    return this.organizationService.checkoutPlan(
      String(req.user?.organizationId || ''),
      String(body?.planId || ''),
      { id: req.user?.id, email: req.user?.email },
    );
  }

  @Permission('billing.manage')
  @Get('subscription/checkout/:reference')
  async checkoutStatus(@Param('reference') reference: string, @Req() req: any) {
    return this.organizationService.checkoutStatus(
      String(req.user?.organizationId || ''),
      String(reference || ''),
    );
  }

  @Permission('billing.manage')
  @Get('subscription/payments')
  async listPayments(@Req() req: any, @Query('limit') limit?: string) {
    return this.organizationService.listPayments(
      String(req.user?.organizationId || ''),
      limit ? Number(limit) : undefined,
    );
  }

  @Permission('billing.manage')
  @Post('subscription/cancel')
  async cancelSubscription(@Req() req: any) {
    return this.organizationService.cancelBilling(
      String(req.user?.organizationId || ''),
      req.user?.id,
    );
  }

  @Permission('billing.manage')
  @Post('subscription/resume')
  async resumeSubscription(@Req() req: any) {
    return this.organizationService.resumeBilling(
      String(req.user?.organizationId || ''),
      req.user?.id,
    );
  }

  @Permission('organization.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Organization> {
    return this.organizationService.findOne(id, String(req.user?.organizationId || ''));
  }

  @Permission('organization.read')
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: any): Promise<Organization | null> {
    return this.organizationService.findBySlug(slug, String(req.user?.organizationId || ''));
  }

  @Permission('organization.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: Partial<Organization>
  ): Promise<Organization> {
    return this.organizationService.update(id, String(req.user?.organizationId || ''), updateDto);
  }

  @Permission('organization.write')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.organizationService.delete(id, String(req.user?.organizationId || ''));
  }

  @Permission('organization.read')
  @Get()
  async findAll(@Req() req: any): Promise<Organization[]> {
    return this.organizationService.findAll(String(req.user?.organizationId || ''));
  }
}
