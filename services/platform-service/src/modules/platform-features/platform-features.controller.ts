import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlatformFeaturesService } from './platform-features.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-features')
@UseGuards(PlatformAdminGuard)
export class PlatformFeaturesController {
  constructor(private readonly platformFeaturesService: PlatformFeaturesService) {}

  @Get()
  findAll() {
    return this.platformFeaturesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformFeaturesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { isEnabled?: boolean; name?: string; description?: string },
    @Request() req: any,
  ) {
    return this.platformFeaturesService.update(id, body, req.user.id);
  }

  @Get(':id/overrides')
  getOverrides(@Param('id') id: string) {
    return this.platformFeaturesService.getOverrides(id);
  }

  @Post(':id/overrides')
  setOverride(
    @Param('id') id: string,
    @Body() body: { organizationId: string; isEnabled: boolean },
    @Request() req: any,
  ) {
    return this.platformFeaturesService.setOverride(id, body, req.user.id);
  }

  @Delete(':id/overrides/:orgId')
  deleteOverride(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req: any) {
    return this.platformFeaturesService.deleteOverride(id, orgId, req.user.id);
  }
}
