import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Permission('platform.manage')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get(':id')
  @Permission('platform.manage')
  getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Put(':id/subscription')
  @Permission('platform.manage')
  updateSubscription(@Param('id') id: string, @Body() body: { subscriptionPlan: string; subscriptionStatus: string }) {
    return this.adminService.updateOrganizationSubscription(id, body);
  }

  @Get(':id/users')
  @Permission('platform.manage')
  listUsers(@Param('id') id: string) {
    return this.adminService.listOrganizationUsers(id);
  }
}
