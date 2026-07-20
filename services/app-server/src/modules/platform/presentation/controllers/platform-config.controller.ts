import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PlatformConfigService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-config')
@UseGuards(PlatformAdminGuard)
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get()
  findAll() {
    return this.configService.findAllConfig();
  }

  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.configService.findConfigByKey(key);
  }

  @Patch()
  update(@Body() body: { configs: Array<{ key: string; value: string; description?: string; category?: string }> }, @Request() req: any) {
    return this.configService.upsertConfigs(body.configs, req.user.id);
  }
}
