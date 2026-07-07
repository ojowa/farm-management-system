import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformAdminGuard, SuperAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-organizations')
@UseGuards(PlatformAdminGuard)
export class PlatformOrganizationsController {
  constructor(private readonly platformOrganizationsService: PlatformOrganizationsService) {}

  @Get()
  findAll(
    @Query() query: { page?: number; limit?: number; search?: string; status?: string; plan?: string },
  ) {
    return this.platformOrganizationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformOrganizationsService.findOne(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body() body: { name: string; slug: string; email?: string; phone?: string; industry?: string; subscriptionPlan?: string }, @Request() req: any) {
    return this.platformOrganizationsService.create(body, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; phone?: string; logo?: string; website?: string; industry?: string; settings?: any },
    @Request() req: any,
  ) {
    return this.platformOrganizationsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  delete(@Param('id') id: string, @Request() req: any) {
    return this.platformOrganizationsService.delete(id, req.user.id);
  }

  @Post(':id/suspend')
  @UseGuards(SuperAdminGuard)
  suspend(@Param('id') id: string, @Request() req: any) {
    return this.platformOrganizationsService.suspend(id, req.user.id);
  }

  @Post(':id/activate')
  @UseGuards(SuperAdminGuard)
  activate(@Param('id') id: string, @Request() req: any) {
    return this.platformOrganizationsService.activate(id, req.user.id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.platformOrganizationsService.getStats(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.platformOrganizationsService.getMembers(id);
  }
}
