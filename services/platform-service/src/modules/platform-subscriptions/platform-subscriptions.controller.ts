import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';
import { PlatformAdminGuard, SuperAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-subscriptions')
@UseGuards(PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(private readonly platformSubscriptionsService: PlatformSubscriptionsService) {}

  @Get('plans')
  findAllPlans() {
    return this.platformSubscriptionsService.findAllPlans();
  }

  @Get('plans/:id')
  findOnePlan(@Param('id') id: string) {
    return this.platformSubscriptionsService.findOnePlan(id);
  }

  @Post('plans')
  @UseGuards(SuperAdminGuard)
  createPlan(
    @Body() body: {
      name: string;
      displayName: string;
      description?: string;
      price?: number;
      currency?: string;
      billingCycle?: string;
      maxUsers?: number;
      maxFarms?: number;
      maxStorage?: number;
      features?: any;
      sortOrder?: number;
    },
    @Request() req: any,
  ) {
    return this.platformSubscriptionsService.createPlan(body, req.user.id);
  }

  @Patch('plans/:id')
  @UseGuards(SuperAdminGuard)
  updatePlan(
    @Param('id') id: string,
    @Body() body: {
      displayName?: string;
      description?: string;
      price?: number;
      currency?: string;
      billingCycle?: string;
      maxUsers?: number;
      maxFarms?: number;
      maxStorage?: number;
      features?: any;
      isActive?: boolean;
      sortOrder?: number;
    },
    @Request() req: any,
  ) {
    return this.platformSubscriptionsService.updatePlan(id, body, req.user.id);
  }

  @Delete('plans/:id')
  @UseGuards(SuperAdminGuard)
  deletePlan(@Param('id') id: string, @Request() req: any) {
    return this.platformSubscriptionsService.deletePlan(id, req.user.id);
  }

  @Patch('organizations/:orgId/subscription')
  @UseGuards(SuperAdminGuard)
  assignSubscription(
    @Param('orgId') orgId: string,
    @Body() body: { planId?: string; status?: string },
    @Request() req: any,
  ) {
    return this.platformSubscriptionsService.assignSubscription(orgId, body, req.user.id);
  }
}
