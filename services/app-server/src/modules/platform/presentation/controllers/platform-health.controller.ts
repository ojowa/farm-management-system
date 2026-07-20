import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PlatformHealthService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';

@Controller('platform-health')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PlatformHealthController {
  constructor(private readonly healthService: PlatformHealthService) {}

  @Get()
  @Permission('platform.manage')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Post('check')
  @Permission('platform.manage')
  checkAll() {
    return this.healthService.checkAll();
  }
}
