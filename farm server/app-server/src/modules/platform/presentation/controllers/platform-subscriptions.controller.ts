import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PlatformSubscriptionService } from '../../application/services/platform.service';
import { PlatformAdminGuard, SuperAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('platform-subscriptions')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(private readonly subscriptionService: PlatformSubscriptionService) {}

  @Get('plans')
  @Permission('platform.manage')
  findAllPlans() {
    return this.subscriptionService.findAllPlans();
  }

  @Get('plans/:id')
  @Permission('platform.manage')
  findOnePlan(@Param('id') id: string) {
    return this.subscriptionService.findOnePlan(id);
  }

  @Post('plans')
  @Permission('platform.manage')
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
    @Req() req: any,
  ) {
    return this.subscriptionService.createPlan(body, req.user.id);
  }

  @Patch('plans/:id')
  @Permission('platform.manage')
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
    @Req() req: any,
  ) {
    return this.subscriptionService.updatePlan(id, body, req.user.id);
  }

  @Delete('plans/:id')
  @Permission('platform.manage')
  deletePlan(@Param('id') id: string, @Req() req: any) {
    return this.subscriptionService.deletePlan(id, req.user.id);
  }
}
