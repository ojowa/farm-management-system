import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlatformFeatureFlagService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-features')
@UseGuards(PlatformAdminGuard)
export class PlatformFeaturesController {
  constructor(private readonly featureFlagService: PlatformFeatureFlagService) {}

  @Get()
  findAll() {
    return this.featureFlagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featureFlagService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { isEnabled?: boolean; name?: string; description?: string }, @Request() req: any) {
    return this.featureFlagService.update(id, body, req.user.id);
  }

  @Get(':id/overrides')
  getOverrides(@Param('id') id: string) {
    return this.featureFlagService.getOverrides(id);
  }

  @Post(':id/overrides')
  setOverride(@Param('id') id: string, @Body() body: { organizationId: string; isEnabled: boolean }, @Request() req: any) {
    return this.featureFlagService.setOverride(id, body, req.user.id);
  }

  @Delete(':id/overrides/:orgId')
  deleteOverride(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req: any) {
    return this.featureFlagService.deleteOverride(id, orgId, req.user.id);
  }
}
