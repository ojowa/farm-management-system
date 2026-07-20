import { Controller, Get, Patch, Delete, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformOrganizationService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';

@Controller('platform-organizations')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PlatformOrganizationsController {
  constructor(private readonly orgService: PlatformOrganizationService) {}

  @Get()
  @Permission('platform.manage')
  findAll(@Query() query: { page?: number; limit?: number; search?: string; subscriptionPlan?: string; subscriptionStatus?: string }) {
    return this.orgService.findAllOrganizations(query);
  }

  @Get(':id')
  @Permission('platform.manage')
  findOne(@Param('id') id: string) {
    return this.orgService.findOrganization(id);
  }

  @Post()
  @Permission('platform.manage')
  create(@Body() body: any, @Request() req: any) {
    return this.orgService.createOrganization(body, req.user.id);
  }

  @Patch(':id')
  @Permission('platform.manage')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.orgService.updateOrganization(id, body, req.user.id);
  }

  @Delete(':id')
  @Permission('platform.manage')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.orgService.deleteOrganization(id, req.user.id);
  }

  @Post(':id/suspend')
  @Permission('platform.manage')
  suspend(@Param('id') id: string, @Request() req: any) {
    return this.orgService.suspendOrganization(id, req.user.id);
  }

  @Post(':id/activate')
  @Permission('platform.manage')
  activate(@Param('id') id: string, @Request() req: any) {
    return this.orgService.activateOrganization(id, req.user.id);
  }

  @Get(':id/stats')
  @Permission('platform.manage')
  stats(@Param('id') id: string) {
    return this.orgService.getOrganizationStats(id);
  }

  @Get(':id/members')
  @Permission('platform.manage')
  members(@Param('id') id: string) {
    return this.orgService.getOrganizationMembers(id);
  }

  @Patch(':id/subscription')
  @Permission('platform.manage')
  updateSubscription(@Param('id') id: string, @Body() body: { subscriptionPlan?: string; subscriptionStatus?: string }, @Request() req: any) {
    return this.orgService.updateOrganizationSubscription(id, body, req.user.id);
  }
}
