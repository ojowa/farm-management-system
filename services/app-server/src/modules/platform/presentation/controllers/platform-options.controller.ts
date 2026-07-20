import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformOptionsService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-options')
@UseGuards(PlatformAdminGuard)
export class PlatformOptionsController {
  constructor(private readonly optionsService: PlatformOptionsService) {}

  @Get()
  getOptions() {
    return this.optionsService.getAllOptions();
  }

  @Get('plans')
  getPlans() {
    return this.optionsService.getSubscriptionPlans();
  }

  @Get('statuses')
  getStatuses() {
    return this.optionsService.getSubscriptionStatuses();
  }

  @Get('broadcast-types')
  getBroadcastTypes() {
    return this.optionsService.getBroadcastTypes();
  }

  @Get('roles')
  getRoles() {
    return this.optionsService.getRoles();
  }

  @Get('platform-admin-roles')
  getPlatformAdminRoles() {
    return this.optionsService.getPlatformAdminRoles();
  }
}
