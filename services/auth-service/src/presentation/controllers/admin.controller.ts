import { Controller, Get, Put, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { UpdateSubscriptionDto } from '../dto/admin.dto';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
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
  updateSubscription(@Param('id') id: string, @Body() body: UpdateSubscriptionDto) {
    return this.adminService.updateOrganizationSubscription(id, body);
  }

  @Get(':id/users')
  @Permission('platform.manage')
  listUsers(@Param('id') id: string) {
    return this.adminService.listOrganizationUsers(id);
  }
}
