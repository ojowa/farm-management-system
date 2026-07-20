import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PlatformHealthService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-health')
@UseGuards(PlatformAdminGuard)
export class PlatformHealthController {
  constructor(private readonly healthService: PlatformHealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Post('check')
  checkAll() {
    return this.healthService.checkAll();
  }
}
