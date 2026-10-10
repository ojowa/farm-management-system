import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { StorageSettingsService, StorageSettingsInput } from '../../../../shared/storage';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-storage')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformStorageController {
  constructor(private readonly storageSettings: StorageSettingsService) {}

  @Get()
  @Permission('platform.manage')
  get() {
    return this.storageSettings.getPublicSettings();
  }

  @Put()
  @Permission('platform.manage')
  update(@Body() body: StorageSettingsInput, @Req() req: any) {
    return this.storageSettings.updateSettings(body, req.user?.id);
  }

  @Post('test')
  @Permission('platform.manage')
  test(@Body() body: StorageSettingsInput) {
    return this.storageSettings.testConnection(body);
  }
}
