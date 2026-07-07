import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-audit')
@UseGuards(PlatformAdminGuard)
export class PlatformAuditController {
  constructor(private readonly platformAuditService: PlatformAuditService) {}

  @Get()
  findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      action?: string;
      entity?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.platformAuditService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformAuditService.findOne(id);
  }
}
