import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformOptionsService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('platform-options')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PlatformOptionsController {
  constructor(private readonly optionsService: PlatformOptionsService) {}

  @Get()
  @Permission('platform.manage')
  getOptions() {
    return this.optionsService.getAllOptions();
  }

  @Get('plans')
  @Permission('platform.manage')
  getPlans() {
    return this.optionsService.getSubscriptionPlans();
  }

  @Get('statuses')
  @Permission('platform.manage')
  getStatuses() {
    return this.optionsService.getSubscriptionStatuses();
  }

  @Get('broadcast-types')
  @Permission('platform.manage')
  getBroadcastTypes() {
    return this.optionsService.getBroadcastTypes();
  }

  @Get('roles')
  @Permission('platform.manage')
  getRoles() {
    return this.optionsService.getRoles();
  }

  @Get('platform-admin-roles')
  @Permission('platform.manage')
  getPlatformAdminRoles() {
    return this.optionsService.getPlatformAdminRoles();
  }
}
