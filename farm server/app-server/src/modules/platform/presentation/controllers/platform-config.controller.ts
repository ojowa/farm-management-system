import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PlatformConfigService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('platform-config')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get()
  @Permission('platform.manage')
  findAll() {
    return this.configService.findAllConfig();
  }

  @Get(':key')
  @Permission('platform.manage')
  findByKey(@Param('key') key: string) {
    return this.configService.findConfigByKey(key);
  }

  @Patch()
  @Permission('platform.manage')
  update(@Body() body: { configs: Array<{ key: string; value: string; description?: string; category?: string }> }, @Req() req: any) {
    return this.configService.upsertConfigs(body.configs, req.user.id);
  }
}
