import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';

@Controller('admin/organizations')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get(':id')
  getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Put(':id/subscription')
  updateSubscription(@Param('id') id: string, @Body() body: { subscriptionPlan: string; subscriptionStatus: string }) {
    return this.adminService.updateOrganizationSubscription(id, body);
  }

  @Get(':id/users')
  listUsers(@Param('id') id: string) {
    return this.adminService.listOrganizationUsers(id);
  }
}
