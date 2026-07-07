import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformAuditController } from './platform-audit.controller';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformAuditController],
  providers: [PlatformAuditService, PlatformAdminGuard],
})
export class PlatformAuditModule {}
