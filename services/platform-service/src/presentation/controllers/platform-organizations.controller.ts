import { Controller, Get, Patch, Delete, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformOrganizationService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-organizations')
@UseGuards(PlatformAdminGuard)
export class PlatformOrganizationsController {
  constructor(private readonly orgService: PlatformOrganizationService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string; subscriptionPlan?: string; subscriptionStatus?: string }) {
    return this.orgService.findAllOrganizations(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orgService.findOrganization(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.orgService.createOrganization(body, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.orgService.updateOrganization(id, body, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.orgService.deleteOrganization(id, req.user.id);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string, @Request() req: any) {
    return this.orgService.suspendOrganization(id, req.user.id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Request() req: any) {
    return this.orgService.activateOrganization(id, req.user.id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.orgService.getOrganizationStats(id);
  }

  @Get(':id/members')
  members(@Param('id') id: string) {
    return this.orgService.getOrganizationMembers(id);
  }

  @Patch(':id/subscription')
  updateSubscription(@Param('id') id: string, @Body() body: { subscriptionPlan?: string; subscriptionStatus?: string }, @Request() req: any) {
    return this.orgService.updateOrganizationSubscription(id, body, req.user.id);
  }
}
