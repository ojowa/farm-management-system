import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentsApplicationService } from '../../application/services/payments.service';
import { PlatformAdminGuard } from '../../../platform/presentation/guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

/** Platform-console view of every Paystack transaction (all orgs). */
@Controller('platform-payments')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformPaymentsController {
  constructor(private readonly payments: PaymentsApplicationService) {}

  @Get()
  @Permission('platform.manage')
  findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      organizationId?: string;
    }
  ) {
    return this.payments.listAllPayments(query);
  }
}
