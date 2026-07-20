import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlatformAuditService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';

@Controller('platform-audit')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PlatformAuditController {
  constructor(private readonly auditService: PlatformAuditService) {}

  @Get()
  @Permission('platform.manage')
  findAll(
    @Query() query: {
      page?: number;
      limit?: number;
      action?: string;
      entity?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @Permission('platform.manage')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
