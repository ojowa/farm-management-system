import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PlatformHealthService } from './platform-health.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-health')
@UseGuards(PlatformAdminGuard)
export class PlatformHealthController {
  constructor(private readonly platformHealthService: PlatformHealthService) {}

  @Get()
  getHealth() {
    return this.platformHealthService.getHealth();
  }

  @Post('check')
  checkAll() {
    return this.platformHealthService.checkAll();
  }
}
