import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformOrganizationsController } from './platform-organizations.controller';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformOrganizationsController],
  providers: [PlatformOrganizationsService, PlatformAdminGuard],
})
export class PlatformOrganizationsModule {}
