import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { ProfitabilityService } from '../../application/services/profitability.service';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('profitability')
export class ProfitabilityController {
  constructor(private readonly profitabilityService: ProfitabilityService) {}

  @Permission('finance.read')
  @Get('farm')
  async getByFarm(
    @Req() req: any,
    @Query('farmId') farmId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = String(req.user?.organizationId || '');
    return this.profitabilityService.getByFarm(orgId, farmId, startDate, endDate);
  }

  @Permission('finance.read')
  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = String(req.user?.organizationId || '');
    return this.profitabilityService.getSummary(orgId, startDate, endDate);
  }
}
